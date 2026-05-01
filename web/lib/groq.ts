import "server-only";
import fs from "node:fs";
import { TOPIC_CACHE_PATH } from "./paths";
import { loadGroqEnv, parseRetryDelay, sleep } from "./groq-env";

type TopicCacheEntry = {
  topic: string;
  prompt_count: number;
};

type TopicCache = Record<string, TopicCacheEntry>;

const MAX_PROMPTS = 8;
const PROMPT_CHAR_CAP = 300;

export function loadTopicCache(): TopicCache {
  if (!fs.existsSync(TOPIC_CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(TOPIC_CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function saveTopicCache(cache: TopicCache) {
  fs.mkdirSync(TOPIC_CACHE_PATH.replace(/\/[^/]+$/, ""), { recursive: true });
  fs.writeFileSync(TOPIC_CACHE_PATH, JSON.stringify(cache, null, 2));
}

export async function summarizeSession(prompts: string[]): Promise<string | null> {
  if (prompts.length === 0) return null;
  const env = loadGroqEnv();
  if (!env) return null;

  const sample = prompts.slice(0, MAX_PROMPTS).map((p) => p.slice(0, PROMPT_CHAR_CAP));
  const system =
    "Sen bir kodlama oturumunun konu başlığını çıkaran asistansın. " +
    "Sana kullanıcının ardışık prompt'ları verilecek; 3-5 Türkçe kelime ile " +
    "oturumun konusunu özetle. Yalnızca başlık metnini döndür — " +
    "markdown (**, _), tırnak, noktalama veya 'Konu:' / 'Başlık:' " +
    "gibi etiketler EKLEME.";

  const body = {
    model: env.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: sample.join("\n---\n") },
    ],
    temperature: 0.2,
    max_tokens: 30,
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(`${env.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "time-tracker-web/1.0",
        },
        body: JSON.stringify(body),
      });
      if (resp.status === 429) {
        const text = await resp.text();
        const waitMs = parseRetryDelay(text) ?? 1500 * (attempt + 1);
        await sleep(waitMs);
        continue;
      }
      if (!resp.ok) {
        console.error("groq http error", resp.status, await resp.text());
        return null;
      }
      const data = (await resp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) return null;
      return cleanTopic(raw);
    } catch (err) {
      console.error("groq fetch failed", err);
      return null;
    }
  }
  return null;
}

function cleanTopic(raw: string): string {
  let s = raw.split("\n")[0] ?? "";
  s = s.replace(/^\**\s*|\s*\**$/g, ""); // markdown bold
  s = s.replace(/^["'`]+|["'`.\s]+$/g, "");
  // "Konu: ...", "Başlık: ...", "Oturum Konusu: ...", "Kodlama Oturumu Konusu: ..."
  s = s.replace(/^(Kodlama\s+Oturumu(\s+Konusu)?|Oturum(\s+Konusu)?|Konu|Başlık)\s*[:：-]\s*/i, "");
  s = s.replace(/^["'`]+|["'`.\s]+$/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, 80);
}

export async function ensureTopicsForSessions(
  sessions: { sessionId: string; prompts: string[]; promptCount: number }[],
): Promise<TopicCache> {
  const cache = loadTopicCache();
  let dirty = false;
  let savedAt = 0;
  for (const s of sessions) {
    const cached = cache[s.sessionId];
    if (cached && cached.prompt_count === s.promptCount) continue;
    const topic = await summarizeSession(s.prompts);
    if (topic) {
      cache[s.sessionId] = { topic, prompt_count: s.promptCount };
      dirty = true;
      // Her 10 başlıkta bir diske yaz ki sayfa refresh edince ilerleme görünsün
      if (dirty && cache && Object.keys(cache).length - savedAt >= 10) {
        saveTopicCache(cache);
        savedAt = Object.keys(cache).length;
      }
    }
  }
  if (dirty) saveTopicCache(cache);
  return cache;
}
