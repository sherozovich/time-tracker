import "server-only";
import fs from "node:fs";
import { CSV_PATH, TZ } from "./paths";
import type {
  DailyPoint,
  ProjectTotal,
  PromptRow,
  Report,
  SessionSummary,
} from "./types";

export const IDLE_CAP_MIN = 10;
export const SINGLE_PROMPT_MIN = 2;

const PROJECTS_PATH_RE = /^\/Users\/[^/]+\/Documents\/projects(?:\/(.*))?\/?$/;

export function normalizeProject(cwd: string): string {
  if (!cwd) return "(bilinmiyor)";
  const trimmed = cwd.replace(/\/+$/, "") || cwd;
  const m = trimmed.match(PROJECTS_PATH_RE);
  if (!m) return cwd;
  const rest = m[1] ?? "";
  if (!rest) return "(projects kökü)";
  return rest.split("/")[0];
}

export { projectSlug } from "./slug";

export function readSessionPrompts(sessionId: string): PromptRow[] {
  return readAllRows()
    .filter((r) => r.sessionId === sessionId)
    .sort((a, b) => a.ts.getTime() - b.ts.getTime());
}

// Row header: optional "-wrapped ISO timestamp followed by a comma.
// CSV has leaked unquoted tool output in the past, which confuses strict
// parsers — anchor on this pattern so mid-prompt junk can't eat valid rows.
const ROW_HEADER_RE = /^"?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)"?,/;

function splitRecords(text: string): string[] {
  const lines = text.split("\n");
  const records: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (ROW_HEADER_RE.test(line)) {
      if (cur) records.push(cur);
      cur = line;
    } else if (cur) {
      cur += "\n" + line;
    }
  }
  if (cur) records.push(cur);
  return records;
}

function parseRecord(rec: string): [string, string, string, string] | null {
  // Extract the first three comma-separated fields (ts, sessionId, cwd).
  // Each may be optionally wrapped in double-quotes; the rest is the prompt.
  const fields: string[] = [];
  let i = 0;
  while (fields.length < 3) {
    if (i >= rec.length) return null;
    if (rec[i] === '"') {
      const end = rec.indexOf('"', i + 1);
      if (end === -1) return null;
      fields.push(rec.slice(i + 1, end));
      i = end + 1;
      if (rec[i] !== ",") return null;
      i++;
    } else {
      const comma = rec.indexOf(",", i);
      if (comma === -1) return null;
      fields.push(rec.slice(i, comma));
      i = comma + 1;
    }
  }
  let prompt = rec.slice(i);
  if (prompt.startsWith('"') && prompt.endsWith('"') && prompt.length >= 2) {
    prompt = prompt.slice(1, -1).replace(/""/g, '"');
  }
  return [fields[0], fields[1], fields[2], prompt];
}

export function readAllRows(): PromptRow[] {
  if (!fs.existsSync(CSV_PATH)) return [];
  const text = fs.readFileSync(CSV_PATH, "utf-8");
  const rows: PromptRow[] = [];
  for (const rec of splitRecords(text)) {
    const parsed = parseRecord(rec);
    if (!parsed) continue;
    const [tsStr, sessionId, cwd, prompt] = parsed;
    const d = new Date(tsStr);
    if (isNaN(d.getTime())) continue;
    rows.push({
      ts: d,
      sessionId,
      cwd,
      project: normalizeProject(cwd),
      prompt,
    });
  }
  return rows;
}

const ISTANBUL_TZ_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toLocalDayKey(d: Date): string {
  // en-CA formatter produces YYYY-MM-DD
  return ISTANBUL_TZ_FMT.format(d);
}

type ComputeOptions = {
  since: Date;
  until: Date;
};

export function computeReport(
  rows: PromptRow[],
  opts: ComputeOptions,
  label: string,
): Report {
  const { since, until } = opts;

  // Group by session
  const bySession = new Map<string, PromptRow[]>();
  for (const r of rows) {
    const arr = bySession.get(r.sessionId) ?? [];
    arr.push(r);
    bySession.set(r.sessionId, arr);
  }

  const projectMinutes = new Map<string, number>();
  const projectSessions = new Map<string, Set<string>>();
  const sessionProjectMinutes = new Map<string, Map<string, number>>();
  const dailyMap = new Map<string, DailyPoint>();

  const sessions: SessionSummary[] = [];

  for (const [sid, eventsRaw] of bySession) {
    const events = [...eventsRaw].sort((a, b) => a.ts.getTime() - b.ts.getTime());
    let sessionMinutes = 0;
    const perProject = new Map<string, number>();
    const inRangeEvents: PromptRow[] = [];

    for (let i = 0; i < events.length; i++) {
      const cur = events[i];
      const next = events[i + 1];
      let minutes: number;
      if (next) {
        const gap = (next.ts.getTime() - cur.ts.getTime()) / 60000;
        minutes = gap > 0 ? Math.min(gap, IDLE_CAP_MIN) : 0;
      } else {
        minutes = SINGLE_PROMPT_MIN;
      }
      if (minutes <= 0) continue;
      if (cur.ts < since || cur.ts >= until) continue;

      inRangeEvents.push(cur);
      sessionMinutes += minutes;
      perProject.set(cur.project, (perProject.get(cur.project) ?? 0) + minutes);

      projectMinutes.set(
        cur.project,
        (projectMinutes.get(cur.project) ?? 0) + minutes,
      );
      const setRef = projectSessions.get(cur.project) ?? new Set<string>();
      setRef.add(sid);
      projectSessions.set(cur.project, setRef);

      const dayKey = toLocalDayKey(cur.ts);
      const d = dailyMap.get(dayKey) ?? {
        day: dayKey,
        minutes: 0,
        byProject: {},
      };
      d.minutes += minutes;
      d.byProject[cur.project] = (d.byProject[cur.project] ?? 0) + minutes;
      dailyMap.set(dayKey, d);
    }

    if (sessionMinutes > 0 && inRangeEvents.length > 0) {
      sessionProjectMinutes.set(sid, perProject);
      let mainProject = "";
      let maxMin = -1;
      for (const [p, m] of perProject) {
        if (m > maxMin) {
          maxMin = m;
          mainProject = p;
        }
      }
      const promptEvents = events.filter((e) => e.prompt);
      sessions.push({
        sessionId: sid,
        project: mainProject,
        firstTs: inRangeEvents[0].ts,
        lastTs: inRangeEvents[inRangeEvents.length - 1].ts,
        promptCount: promptEvents.length,
        minutes: sessionMinutes,
        prompts: promptEvents.map((e) => e.prompt),
        promptEntries: promptEvents.map((e) => ({ ts: e.ts, text: e.prompt })),
      });
    }
  }

  const projects: ProjectTotal[] = [...projectMinutes.entries()]
    .map(([project, minutes]) => ({
      project,
      minutes,
      sessionCount: projectSessions.get(project)?.size ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const totalMinutes = projects.reduce((s, p) => s + p.minutes, 0);
  const daily = [...dailyMap.values()].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );

  sessions.sort((a, b) => b.minutes - a.minutes);

  return { since, until, label, totalMinutes, projects, sessions, daily };
}
