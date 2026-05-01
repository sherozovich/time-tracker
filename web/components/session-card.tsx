"use client";
import { useState } from "react";
import Link from "next/link";
import { humanMinutes } from "@/lib/format";
import { projectSlug } from "@/lib/slug";

type PromptEntry = {
  ts: string;
  text: string;
};

type Props = {
  sessionId: string;
  project: string;
  topic: string | null;
  minutes: number;
  promptCount: number;
  firstTs: string;
  lastTs: string;
  prompts: PromptEntry[];
  cachedSummary: string | null;
  showProjectBadge?: boolean;
  isActive?: boolean;
};

const tsFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const hhmmFmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
});

export function SessionCard({
  sessionId,
  project,
  topic,
  minutes,
  promptCount,
  firstTs,
  lastTs,
  prompts,
  cachedSummary,
  showProjectBadge = false,
  isActive = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(cachedSummary);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const firstDate = new Date(firstTs);
  const lastDate = new Date(lastTs);

  async function loadSummary() {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const r = await fetch("/api/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { summary: string };
      setSummary(data.summary);
    } catch (e) {
      setSummaryError(String(e));
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-diffuse)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition active:translate-y-[1px] hover:bg-[var(--border)]/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {showProjectBadge && (
              <Link
                href={`/projects/${projectSlug(project)}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-0.5 font-mono text-[11px] tracking-wide text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                {project}
              </Link>
            )}
            <span className="truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]">
              {topic ?? (
                <span className="italic text-[var(--muted)]">
                  (başlık üretilmedi)
                </span>
              )}
            </span>
            {isActive ? (
              <span
                className="relative inline-flex h-1.5 w-1.5 shrink-0"
                aria-label="Aktif oturum"
                title="Son 10 dakikada aktif"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] tracking-wide text-[var(--muted)]">
            <span>{promptCount} prompt</span>
            <span aria-hidden>·</span>
            <span>
              {tsFmt.format(firstDate)} → {hhmmFmt.format(lastDate)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm tabular-nums text-[var(--foreground)]">
            {humanMinutes(minutes)}
          </span>
          <span
            className={
              "text-[var(--muted)] transition-transform duration-200 " +
              (open ? "rotate-90" : "")
            }
            aria-hidden
          >
            ›
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-6 py-5">
          <div className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Detaylı özet
              </h3>
              {!summary && !loadingSummary && (
                <button
                  onClick={loadSummary}
                  className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs font-medium tracking-tight text-[var(--background)] transition active:translate-y-[1px]"
                >
                  Özet al
                </button>
              )}
              {summary && !loadingSummary && (
                <button
                  onClick={loadSummary}
                  className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                >
                  Yeniden al
                </button>
              )}
              {loadingSummary && (
                <span className="font-mono text-xs text-[var(--muted)]">
                  üretiliyor…
                </span>
              )}
            </div>
            {summary ? (
              <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--foreground)]/85">
                {summary.split("\n").map((line, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{line.replace(/^-\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            ) : summaryError ? (
              <p className="font-mono text-xs text-rose-500">
                Hata: {summaryError}
              </p>
            ) : !loadingSummary ? (
              <p className="text-xs text-[var(--muted)]">
                Groq ile 4-6 maddelik özet üretilir (~1sn).
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Tüm prompt&apos;lar · {prompts.length}
            </h3>
            <ol className="space-y-1.5">
              {prompts.map((p, i) => {
                const d = new Date(p.ts);
                return (
                  <li
                    key={i}
                    className="flex gap-3 text-xs text-[var(--muted)]"
                  >
                    <span className="shrink-0 font-mono tabular-nums text-[var(--muted)]">
                      {hhmmFmt.format(d)}
                    </span>
                    <span className="line-clamp-2 flex-1 text-[var(--foreground)]/75">
                      {p.text || (
                        <span className="italic text-[var(--muted)]">
                          (boş)
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
