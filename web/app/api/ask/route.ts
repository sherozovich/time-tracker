import { NextResponse } from "next/server";
import { readAllRows, computeReport } from "@/lib/data";
import { loadTopicCache } from "@/lib/groq";
import { loadSummaryCache } from "@/lib/summary";
import { askGemini, type SessionDigest } from "@/lib/gemini";
import { loadGeminiEnv } from "@/lib/gemini-env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!loadGeminiEnv()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY tanımlı değil." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: unknown;
  };
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Soru boş." }, { status: 400 });
  }

  const rows = readAllRows();
  const report = computeReport(
    rows,
    { since: new Date(0), until: new Date(Date.now() + 1) },
    "all",
  );
  const topicCache = loadTopicCache();
  const summaryCache = loadSummaryCache();

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

  const ai = await askGemini(question, digests);
  if (!ai) {
    return NextResponse.json(
      { error: "Gemini yanıt vermedi." },
      { status: 502 },
    );
  }

  const minutesById = new Map(report.sessions.map((s) => [s.sessionId, s]));
  const matched = ai.matchedIds
    .map((id) => minutesById.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const totalMinutes = matched.reduce((sum, s) => sum + s.minutes, 0);

  return NextResponse.json({
    question,
    narrative: ai.narrative,
    totalMinutes,
    matched: matched.map((s) => ({
      sessionId: s.sessionId,
      project: s.project,
      topic: topicCache[s.sessionId]?.topic ?? null,
      minutes: Math.round(s.minutes),
      firstTs: s.firstTs.toISOString(),
      lastTs: s.lastTs.toISOString(),
      promptCount: s.promptCount,
    })),
  });
}
