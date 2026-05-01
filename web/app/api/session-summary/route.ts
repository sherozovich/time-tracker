import { NextResponse } from "next/server";
import { readSessionPrompts } from "@/lib/data";
import { summarizeSessionDetailed } from "@/lib/summary";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: unknown;
  };
  if (typeof body.sessionId !== "string" || !body.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const rows = readSessionPrompts(body.sessionId);
  if (rows.length === 0) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const prompts = rows.map((r) => r.prompt).filter((p) => p);
  const summary = await summarizeSessionDetailed(
    body.sessionId,
    prompts,
    prompts.length,
  );

  if (!summary) {
    return NextResponse.json({ error: "summary failed" }, { status: 500 });
  }

  return NextResponse.json({ summary });
}
