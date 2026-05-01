export type PromptRow = {
  ts: Date;
  sessionId: string;
  cwd: string;
  project: string;
  prompt: string;
};

export type SessionPrompt = {
  ts: Date;
  text: string;
};

export type SessionSummary = {
  sessionId: string;
  project: string;
  firstTs: Date;
  lastTs: Date;
  promptCount: number;
  minutes: number;
  prompts: string[];
  promptEntries: SessionPrompt[];
};

export type ProjectTotal = {
  project: string;
  minutes: number;
  sessionCount: number;
};

export type DailyPoint = {
  day: string; // YYYY-MM-DD (yerel TZ)
  minutes: number;
  byProject: Record<string, number>;
};

export type Report = {
  since: Date;
  until: Date;
  label: string;
  totalMinutes: number;
  projects: ProjectTotal[];
  sessions: SessionSummary[];
  daily: DailyPoint[];
};

export type RangeMode = "today" | "week" | "month" | "days7" | "days30" | "all";
