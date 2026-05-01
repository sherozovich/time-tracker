import Link from "next/link";
import { notFound } from "next/navigation";
import { computeReport, readAllRows } from "@/lib/data";
import { isRangeMode, resolveRange } from "@/lib/time-range";
import { humanDateRange, humanMinutes } from "@/lib/format";
import { loadTopicCache } from "@/lib/groq";
import { loadSummaryCache } from "@/lib/summary";
import { RangeSelector } from "@/components/range-selector";
import { DailyChart } from "@/components/daily-chart";
import { RefreshTopicsButton } from "@/components/refresh-topics-button";
import { SessionList } from "@/components/session-list";
import { StatStrip } from "@/components/stat-card";
import { MotionSection } from "@/components/motion/motion-section";
import { AutoRefresh } from "@/components/auto-refresh";
import type { RangeMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { project } = await params;
  const sp = await searchParams;
  const mode: RangeMode = isRangeMode(sp.range) ? sp.range : "today";
  const range = resolveRange(mode);
  const decoded = decodeURIComponent(project);

  const rows = readAllRows().filter((r) => r.project === decoded);
  if (rows.length === 0) notFound();

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
  // Server Component: render once per request, Date.now() is the request time.
  // eslint-disable-next-line react-hooks/purity
  const activeCutoff = Date.now() - 10 * 60 * 1000;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <span aria-hidden>←</span> Tüm projeler
        </Link>
      </div>

      <header className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Proje · {range.label}
          </p>
          <h1 className="text-4xl font-semibold leading-none tracking-tighter text-[var(--foreground)] sm:text-5xl">
            {decoded}
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
            { label: "Bu dönem toplam", value: humanMinutes(report.totalMinutes) },
            { label: "Oturum", value: report.sessions.length.toString() },
            {
              label: "Ortalama oturum",
              value:
                report.sessions.length > 0
                  ? humanMinutes(report.totalMinutes / report.sessions.length)
                  : "—",
            },
          ]}
        />
      </MotionSection>

      <MotionSection className="mb-12 rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-diffuse)] sm:p-8">
        <h2 className="mb-5 text-sm font-medium tracking-tight text-[var(--foreground)]">
          Günlük dağılım
        </h2>
        <DailyChart daily={report.daily} />
      </MotionSection>

      <MotionSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium tracking-tight text-[var(--foreground)]">
            Oturumlar ve konular
          </h2>
          <RefreshTopicsButton sessionIds={uncachedSessionIds} />
        </div>
        {report.sessions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Bu dönem için oturum yok.</p>
        ) : (
          <SessionList
            sessions={report.sessions.map((s) => ({
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

