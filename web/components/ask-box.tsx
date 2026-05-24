"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { humanMinutes } from "@/lib/format";
import { projectSlug } from "@/lib/slug";

type MatchedSession = {
  sessionId: string;
  project: string;
  topic: string | null;
  minutes: number;
  firstTs: string;
  lastTs: string;
  promptCount: number;
};

type AskResponse = {
  question: string;
  narrative: string;
  totalMinutes: number;
  matched: MatchedSession[];
};

const SUGGESTIONS = [
  "rent-app projesinde toplam ne kadar çalıştım?",
  "auth ve login üzerinde kaç saat geçirdim?",
  "Bu hafta en çok hangi konuya zaman ayırdım?",
];

export function AskBox() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as AskResponse;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-diffuse)] sm:p-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-tight text-[var(--foreground)]">
          Sorula
        </h2>
        <span className="font-mono text-[11px] tracking-wide text-[var(--muted)]">
          Gemini
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={busy}
          placeholder="örn. rent-app'ta auth üzerinde kaç saat çalıştım?"
          className="flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm tracking-tight text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--foreground)] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium tracking-tight text-[var(--background)] shadow-[var(--shadow-diffuse)] transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
            {busy ? (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              </>
            ) : (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </span>
          {busy ? "Düşünüyor…" : "Sor"}
        </button>
      </form>

      {!result && !busy && !error ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQ(s);
                ask(s);
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 font-mono text-[11px] tracking-wide text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 font-mono text-xs text-red-500"
          >
            Hata: {error}
          </motion.p>
        ) : null}

        {result ? (
          <motion.div
            key={result.question}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="mt-5 border-t border-[var(--border)] pt-5"
          >
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-2xl font-semibold leading-none tracking-tighter text-[var(--foreground)]">
                {humanMinutes(result.totalMinutes)}
              </span>
              <span className="font-mono text-[11px] tracking-wide text-[var(--muted)]">
                {result.matched.length} oturum
              </span>
            </div>
            {result.narrative ? (
              <p className="mb-4 text-sm leading-relaxed text-[var(--foreground)]/85">
                {result.narrative}
              </p>
            ) : null}

            {result.matched.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {result.matched.slice(0, 12).map((s) => (
                  <li
                    key={s.sessionId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${projectSlug(s.project)}`}
                          className="font-mono text-[11px] uppercase tracking-wide text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                          {s.project}
                        </Link>
                        <span className="text-[var(--muted)]">·</span>
                        <span className="font-mono text-[11px] text-[var(--muted)]">
                          {new Date(s.firstTs).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[var(--foreground)]">
                        {s.topic || "(konu yok)"}
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-xs tracking-tight text-[var(--foreground)]">
                      {humanMinutes(s.minutes)}
                    </div>
                  </li>
                ))}
                {result.matched.length > 12 ? (
                  <li className="px-3 font-mono text-[11px] text-[var(--muted)]">
                    +{result.matched.length - 12} oturum daha…
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Eşleşen oturum bulunamadı.
              </p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
