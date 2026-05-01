import { NextResponse } from "next/server";
import { readAllRows, computeReport } from "@/lib/data";
import { ensureTopicsForSessions } from "@/lib/groq";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionIds?: unknown;
  };
  const wanted = new Set<string>(
    Array.isArray(body.sessionIds)
      ? body.sessionIds.filter((v): v is string => typeof v === "string")
      : [],
  );

  const rows = readAllRows();
  // Tüm zamanları topla, request edilen session'ları bulalım
  const report = computeReport(
    rows,
    { since: new Date(0), until: new Date(Date.now() + 1) },
    "all",
  );

  const targets = wanted.size > 0
    ? report.sessions.filter((s) => wanted.has(s.sessionId))
    : report.sessions;

  const before = targets.length;
  const cache = await ensureTopicsForSessions(
    targets.map((s) => ({
      sessionId: s.sessionId,
      prompts: s.prompts,
      promptCount: s.promptCount,
    })),
  );

  const updated = targets.filter((s) => {
    const c = cache[s.sessionId];
    return c && c.prompt_count === s.promptCount;
  }).length;

  return NextResponse.json({
    requested: before,
    updated,
  });
}
