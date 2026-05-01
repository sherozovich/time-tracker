"use client";
import { MotionList, MotionItem } from "@/components/motion/motion-list";
import { SessionCard } from "@/components/session-card";

type PromptEntry = { ts: string; text: string };

type SessionRow = {
  sessionId: string;
  project: string;
  topic: string | null;
  minutes: number;
  promptCount: number;
  firstTs: string;
  lastTs: string;
  prompts: PromptEntry[];
  cachedSummary: string | null;
  isActive?: boolean;
};

export function SessionList({
  sessions,
  showProjectBadge = false,
}: {
  sessions: SessionRow[];
  showProjectBadge?: boolean;
}) {
  return (
    <MotionList className="space-y-3">
      {sessions.map((s) => (
        <MotionItem key={s.sessionId} layoutId={`sess-${s.sessionId}`}>
          <SessionCard {...s} showProjectBadge={showProjectBadge} />
        </MotionItem>
      ))}
    </MotionList>
  );
}
