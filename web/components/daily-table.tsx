import { humanMinutes } from "@/lib/format";
import { projectSlug } from "@/lib/data";
import Link from "next/link";
import type { DailyPoint } from "@/lib/types";

export function DailyTable({ daily }: { daily: DailyPoint[] }) {
  if (daily.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">Bu dönem için günlük veri yok.</p>
    );
  }
  const dayFmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
  const ordered = [...daily].sort((a, b) => (a.day < b.day ? 1 : -1));
  return (
    <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-diffuse)]">
      {ordered.map((d) => {
        const [y, m, dd] = d.day.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, dd, 9, 0, 0));
        const parts = [...Object.entries(d.byProject)].sort((a, b) => b[1] - a[1]);
        return (
          <li key={d.day} className="px-6 py-5">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <div className="text-sm font-medium tracking-tight text-[var(--foreground)]">
                {dayFmt.format(date)}
              </div>
              <div className="font-mono text-sm tabular-nums text-[var(--foreground)]">
                {humanMinutes(d.minutes)}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tracking-wide text-[var(--muted)]">
              {parts.map(([proj, mins]) => (
                <Link
                  key={proj}
                  href={`/projects/${projectSlug(proj)}`}
                  className="transition hover:text-[var(--foreground)]"
                >
                  <span>{proj}</span>{" "}
                  <span className="tabular-nums text-[var(--muted)]/70">
                    {humanMinutes(mins)}
                  </span>
                </Link>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
