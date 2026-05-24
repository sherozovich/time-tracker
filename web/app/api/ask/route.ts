import { NextResponse } from "next/server";
import { readAllRows, computeReport, IDLE_CAP_MIN, SINGLE_PROMPT_MIN } from "@/lib/data";
import { loadTopicCache } from "@/lib/groq";
import { loadSummaryCache } from "@/lib/summary";
import {
  askGemini,
  askGeminiPromptLevel,
  type SessionDigest,
  type SessionWithPrompts,
} from "@/lib/gemini";
import { loadGeminiEnv } from "@/lib/gemini-env";

export const dynamic = "force-dynamic";

// Pass 2 ölçek limitleri — payload'ı 1MB altında tutmak için.
const MAX_SESSIONS_PASS2 = 30;
const MAX_PROMPTS_PER_SESSION = 150;
const PROMPT_CHAR_CAP = 200;

export async function POST(request: Request) {
  if (!loadGeminiEnv()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlı değil." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: unknown;
    project?: unknown;
  };
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const projectFilter =
    typeof body.project === "string" && body.project.trim() ? body.project.trim() : null;
  if (!question) {
    return NextResponse.json({ error: "Soru boş." }, { status: 400 });
  }

  let rows = readAllRows();
  if (projectFilter) rows = rows.filter((r) => r.project === projectFilter);

  const report = computeReport(
    rows,
    { since: new Date(0), until: new Date(Date.now() + 1) },
    "all",
  );
  const topicCache = loadTopicCache();
  const summaryCache = loadSummaryCache();

  // ----- Pass 1: hangi oturumlar ilgili -----
  const digests: SessionDigest[] = report.sessions.map((s) => ({
    sessionId: s.sessionId,
    project: s.project,
    topic: topicCache[s.sessionId]?.topic ?? null,
    summary: summaryCache[s.sessionId]?.summary ?? null,
    minutes: s.minutes,
    firstTs: s.firstTs.toISOString(),
    lastTs: s.lastTs.toISOString(),
    promptCount: s.promptCount,
  }));

  const pass1 = await askGemini(question, digests);
  if (!pass1) {
    return NextResponse.json(
      { error: "Gemini yanıt vermedi." },
      { status: 502 },
    );
  }

  const candidateIds = new Set(pass1.matchedIds);
  const candidates = report.sessions
    .filter((s) => candidateIds.has(s.sessionId))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, MAX_SESSIONS_PASS2);

  // ----- Pass 2: oturum içindeki hangi prompt'lar ilgili -----
  const pass2Input: SessionWithPrompts[] = candidates.map((s) => ({
    sessionId: s.sessionId,
    project: s.project,
    topic: topicCache[s.sessionId]?.topic ?? null,
    prompts: s.promptEntries.slice(0, MAX_PROMPTS_PER_SESSION).map((p, idx) => ({
      idx,
      ts: p.ts.toISOString(),
      text: p.text.slice(0, PROMPT_CHAR_CAP),
    })),
  }));

  const pass2 = await askGeminiPromptLevel(question, pass2Input);
  if (!pass2) {
    return NextResponse.json(
      { error: "Prompt-level analiz başarısız." },
      { status: 502 },
    );
  }

  const matchMap = new Map<string, Set<number>>(
    pass2.map((m) => [m.sessionId, new Set(m.matchedIndices)]),
  );

  // ----- Süre hesabı: sadece eşleşen prompt'ların gap'leri -----
  const matched = candidates
    .map((s) => {
      const matchedIdx = matchMap.get(s.sessionId) ?? new Set<number>();
      if (matchedIdx.size === 0) return null;
      const events = s.promptEntries;

      let mMinutes = 0;
      let firstMatch: Date | null = null;
      let lastMatch: Date | null = null;

      for (let i = 0; i < events.length; i++) {
        if (!matchedIdx.has(i)) continue;
        const cur = events[i];
        const next = events[i + 1];
        if (next) {
          const gap = (next.ts.getTime() - cur.ts.getTime()) / 60000;
          if (gap > 0) mMinutes += Math.min(gap, IDLE_CAP_MIN);
        } else {
          mMinutes += SINGLE_PROMPT_MIN;
        }
        if (!firstMatch || cur.ts < firstMatch) firstMatch = cur.ts;
        if (!lastMatch || cur.ts > lastMatch) lastMatch = cur.ts;
      }

      return {
        sessionId: s.sessionId,
        project: s.project,
        topic: topicCache[s.sessionId]?.topic ?? null,
        sessionMinutes: Math.round(s.minutes),
        matchedMinutes: Math.round(mMinutes),
        matchedPromptCount: matchedIdx.size,
        totalPromptCount: s.promptCount,
        firstTs: (firstMatch ?? s.firstTs).toISOString(),
        lastTs: (lastMatch ?? s.lastTs).toISOString(),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.matchedMinutes - a.matchedMinutes);

  const totalMinutes = matched.reduce((sum, m) => sum + m.matchedMinutes, 0);

  return NextResponse.json({
    question,
    project: projectFilter,
    narrative: pass1.narrative,
    totalMinutes,
    matched,
  });
}
