import { computeReport, readAllRows } from "@/lib/data";
import { isRangeMode, resolveRange } from "@/lib/time-range";
import { humanDateRange, humanMinutes } from "@/lib/format";
import { loadTopicCache } from "@/lib/groq";
import { loadSummaryCache } from "@/lib/summary";
import { RangeSelector } from "@/components/range-selector";
import { ProjectBarList } from "@/components/project-bar-list";
import { DailyChart } from "@/components/daily-chart";
import { DailyTable } from "@/components/daily-table";
import { RefreshTopicsButton } from "@/components/refresh-topics-button";
import { SessionList } from "@/components/session-list";
import { StatStrip } from "@/components/stat-card";
import { MotionSection } from "@/components/motion/motion-section";
import { AutoRefresh } from "@/components/auto-refresh";
import type { RangeMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const mode: RangeMode = isRangeMode(sp.range) ? sp.range : "today";
  const range = resolveRange(mode);

  const rows = readAllRows();
  const report = computeReport(
    rows,
    { since: range.since, until: range.until },
    range.label,
  );

  const cache = loadTopicCache();
  const summaryCache = loadSummaryCache();
  const uncachedSessionIds = report.sessions
    .filter((s) => {
      const c = cache[s.sessionId];
      return !c || c.prompt_count !== s.promptCount;
    })
    .map((s) => s.sessionId);

  const topSessions = report.sessions.slice(0, 8);
  // Server Component: render once per request, Date.now() is the request time.
  // eslint-disable-next-line react-hooks/purity
  const activeCutoff = Date.now() - 10 * 60 * 1000;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Time Tracker
          </p>
          <h1 className="text-4xl font-semibold leading-none tracking-tighter text-[var(--foreground)] sm:text-5xl">
            {range.label}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-wide text-[var(--muted)]">
            <span>{humanDateRange(range.since, range.until)}</span>
            <AutoRefresh />
          </p>
        </div>
        <RangeSelector current={range.mode} />
      </header>

      <MotionSection className="mb-12">
        <StatStrip
          items={[
            { label: "Toplam süre", value: humanMinutes(report.totalMinutes) },
            { label: "Aktif proje", value: report.projects.length.toString() },
            { label: "Oturum sayısı", value: report.sessions.length.toString() },
          ]}
        />
      </MotionSection>

      <MotionSection className="mb-12 rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-diffuse)] sm:p-8">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-sm font-medium tracking-tight text-[var(--foreground)]">
            Günlük dağılım
          </h2>
          <span className="font-mono text-[11px] tracking-wide text-[var(--muted)]">
            {report.daily.length} gün
          </span>
        </div>
        <DailyChart daily={report.daily} stackByProject />
      </MotionSection>

      <MotionSection className="mb-12">
        <h2 className="mb-4 text-sm font-medium tracking-tight text-[var(--foreground)]">
          Günlük döküm
        </h2>
        <DailyTable daily={report.daily} />
      </MotionSection>

      <MotionSection className="mb-12">
        <h2 className="mb-4 text-sm font-medium tracking-tight text-[var(--foreground)]">
          Projeler
        </h2>
        <ProjectBarList
          projects={report.projects}
          total={report.totalMinutes}
        />
      </MotionSection>

      <MotionSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium tracking-tight text-[var(--foreground)]">
            En uzun oturumlar
          </h2>
          <RefreshTopicsButton sessionIds={uncachedSessionIds} />
        </div>
        {topSessions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Oturum yok.</p>
        ) : (
          <SessionList
            showProjectBadge
            sessions={topSessions.map((s) => ({
              sessionId: s.sessionId,
              project: s.project,
              topic: cache[s.sessionId]?.topic ?? null,
              minutes: s.minutes,
              promptCount: s.promptCount,
              firstTs: s.firstTs.toISOString(),
              lastTs: s.lastTs.toISOString(),
              prompts: s.promptEntries.map((p) => ({
                ts: p.ts.toISOString(),
                text: p.text,
              })),
              cachedSummary: summaryCache[s.sessionId]?.summary ?? null,
              isActive: s.lastTs.getTime() >= activeCutoff,
            }))}
          />
        )}
      </MotionSection>
    </div>
  );
}
