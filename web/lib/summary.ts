import "server-only";
import fs from "node:fs";
import path from "node:path";
import { TRACKER_ROOT } from "./paths";
import { loadGroqEnv, parseRetryDelay, sleep } from "./groq-env";

const SUMMARY_CACHE_PATH = path.join(
  TRACKER_ROOT,
  "data",
  "session-summaries.json",
);

type SummaryEntry = {
  summary: string;
  prompt_count: number;
};

type SummaryCache = Record<string, SummaryEntry>;

const MAX_PROMPTS = 30;
const PROMPT_CHAR_CAP = 400;

export function loadSummaryCache(): SummaryCache {
  if (!fs.existsSync(SUMMARY_CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SUMMARY_CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveSummaryCache(cache: SummaryCache) {
  fs.mkdirSync(path.dirname(SUMMARY_CACHE_PATH), { recursive: true });
  fs.writeFileSync(SUMMARY_CACHE_PATH, JSON.stringify(cache, null, 2));
}

export async function summarizeSessionDetailed(
  sessionId: string,
  prompts: string[],
  promptCount: number,
): Promise<string | null> {
  const cache = loadSummaryCache();
  const existing = cache[sessionId];
  if (existing && existing.prompt_count === promptCount) {
    return existing.summary;
  }
  const env = loadGroqEnv();
  if (!env) return null;
  if (prompts.length === 0) return null;

  const sample = prompts
    .filter((p) => p && !p.startsWith("<ide_opened_file>") && !p.startsWith("<system-reminder>"))
    .slice(0, MAX_PROMPTS)
    .map((p) => p.slice(0, PROMPT_CHAR_CAP));

  const system =
    "Sen bir kodlama oturumunun detaylı özetini çıkaran asistansın. " +
    "Sana kullanıcının prompt'ları verilecek; bu oturumda somut olarak NE YAPILDIĞINI " +
    "4-6 kısa madde halinde özetle.\n\n" +
    "KURALLAR:\n" +
    "- Her madde '- ' ile başlar\n" +
    "- Her madde 4-10 kelime arası, tek cümlecik\n" +
    "- Teknik terimleri koru (port, endpoint, deploy, repo, PDF, R2 vb.)\n" +
    "- HİÇBİR giriş/sonuç cümlesi yazma\n" +
    "- HİÇBİR başlık yazma (ör. 'Özet:', 'Kodlama Oturumu' gibi)\n" +
    "- Markdown kalın (**, __) KULLANMA\n" +
    "- Madde içinde ':' kullanma, iki parçaya bölme\n\n" +
    "ÖRNEK ÇIKTI:\n" +
    "- Logo tasarımını mavi tona çevirdi\n" +
    "- Ürün listelemeye kategori filtresi ekledi\n" +
    "- Production deploy öncesi build hatalarını düzeltti";

  const body = {
    model: env.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: sample.join("\n---\n") },
    ],
    temperature: 0.3,
    max_tokens: 400,
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
        const wait = parseRetryDelay(text) ?? 1500 * (attempt + 1);
        await sleep(wait);
        continue;
      }
      if (!resp.ok) {
        console.error("groq summary http", resp.status, await resp.text());
        return null;
      }
      const data = (await resp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) return null;
      const cleaned = cleanSummary(raw);
      cache[sessionId] = { summary: cleaned, prompt_count: promptCount };
      saveSummaryCache(cache);
      return cleaned;
    } catch (err) {
      console.error("groq summary failed", err);
      return null;
    }
  }
  return null;
}

function cleanSummary(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[-•*·]\s*/, "").replace(/^\d+[.)]\s*/, ""))
    .map((l) => l.replace(/\*\*/g, "").replace(/__/g, ""))
    .map((l) => l.replace(/^[\s*_]+|[\s*_]+$/g, ""))
    .filter((l) => {
      if (l.length < 4) return false;
      // "Özet", "Kodlama Oturumu" gibi başlık satırlarını at
      if (/^(özet|kodlama oturumu|başlık|oturum özeti|kullanıcı)\b/i.test(l)) {
        return false;
      }
      return true;
    })
    .map((l) => `- ${l}`);
  return lines.slice(0, 8).join("\n");
}
