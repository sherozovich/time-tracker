import "server-only";
import { loadGeminiEnv } from "./gemini-env";

export type SessionDigest = {
  sessionId: string;
  project: string;
  topic: string | null;
  summary: string | null;
  minutes: number;
  firstTs: string; // ISO
  lastTs: string;
  promptCount: number;
};

export type AskResult = {
  matchedIds: string[];
  narrative: string;
};

const SYSTEM = `Sen kullanıcının Claude Code çalışma geçmişini inceleyen bir analizci asistansın. Sana JSON formatında oturum (session) listesi verilir; her oturumda proje adı, kısa konu (topic), opsiyonel detaylı özet (summary), dakika cinsinden süre, ilk/son timestamp ve prompt sayısı bulunur.

Kullanıcının doğal dildeki sorusunu oku ve EŞLEŞEN oturumların ID'lerini döndür. Saat hesaplamasını sen yapma — biz dakikaları lokal olarak toplayacağız. Sadece hangi oturumların ilgili olduğunu seç.

Eşleştirme kuralları:
- "proje X üzerinde kaç saat" → o projedeki tüm oturumlar
- "auth / oturum / login" gibi konu sorusu → topic veya summary'sinde geçen oturumlar
- "geçen hafta", "dün", "bugün" gibi zaman sorusu → ilgili tarih aralığındaki oturumlar
- Belirsiz sorularda topic ve summary metnini dikkatle tara, gevşek eşleştir
- Hiçbir eşleşme yoksa boş liste döndür

"narrative" alanına 1-2 cümlelik Türkçe doğal cevap yaz (örn: "rent-app projesinde toplam 7 oturum bulundu, çoğunluğu auth ve API integration üzerine."). Toplam saati yazma — biz ekleyeceğiz.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    matched_ids: {
      type: "array",
      items: { type: "string" },
    },
    narrative: { type: "string" },
  },
  required: ["matched_ids", "narrative"],
  propertyOrdering: ["matched_ids", "narrative"],
};

export async function askGemini(
  question: string,
  sessions: SessionDigest[],
): Promise<AskResult | null> {
  const env = loadGeminiEnv();
  if (!env) return null;

  const sessionsJson = sessions.map((s) => ({
    id: s.sessionId,
    project: s.project,
    topic: s.topic,
    summary: s.summary,
    minutes: Math.round(s.minutes),
    first_ts: s.firstTs,
    last_ts: s.lastTs,
    prompt_count: s.promptCount,
  }));

  const userPrompt =
    `Bugünün tarihi: ${new Date().toISOString().slice(0, 10)}.\n\n` +
    `Soru: ${question}\n\n` +
    `Oturumlar (JSON):\n${JSON.stringify(sessionsJson)}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.model}:generateContent`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error("gemini http error", resp.status, await resp.text());
      return null;
    }
    const data = (await resp.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      matched_ids?: unknown;
      narrative?: unknown;
    };
    const matchedIds = Array.isArray(parsed.matched_ids)
      ? parsed.matched_ids.filter((x): x is string => typeof x === "string")
      : [];
    const narrative =
      typeof parsed.narrative === "string" ? parsed.narrative : "";
    return { matchedIds, narrative };
  } catch (err) {
    console.error("gemini fetch failed", err);
    return null;
  }
}
