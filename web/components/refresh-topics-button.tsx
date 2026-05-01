"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function RefreshTopicsButton({ sessionIds }: { sessionIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState(0);

  async function handle() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { requested: number; updated: number };
      setMsg(
        data.requested === data.updated
          ? `${data.updated} başlık güncellendi`
          : `${data.updated}/${data.requested} başlık güncellendi`,
      );
      setSuccessKey((k) => k + 1);
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg(`Hata: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const running = busy || pending;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handle}
        disabled={running || sessionIds.length === 0}
        className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium tracking-tight text-[var(--background)] shadow-[var(--shadow-diffuse)] transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
          {running ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </>
          ) : (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          )}
        </span>
        <span className="relative z-10">
          {running ? "Çalışıyor…" : `Başlıkları yenile · ${sessionIds.length}`}
        </span>
        <AnimatePresence>
          {successKey > 0 && (
            <motion.span
              key={successKey}
              className="pointer-events-none absolute inset-0 rounded-full bg-[var(--accent)]"
              initial={{ opacity: 0.5, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </AnimatePresence>
      </button>
      {msg ? (
        <motion.span
          key={msg}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="font-mono text-xs text-[var(--muted)]"
        >
          {msg}
        </motion.span>
      ) : null}
    </div>
  );
}
