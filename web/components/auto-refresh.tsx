"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL = 30_000;

export function AutoRefresh({ intervalMs = DEFAULT_INTERVAL }: { intervalMs?: number }) {
  const router = useRouter();
  // null on SSR; populated on client mount to avoid hydration mismatch.
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Client-only init (SSR produces null → visual chip placeholder), then
    // intervals drive updates. setState here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastRefreshed(Date.now());
    setNow(Date.now());

    const tick = window.setInterval(() => setNow(Date.now()), 1000);

    const refresh = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastRefreshed(Date.now());
    }, intervalMs);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setLastRefreshed(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, router]);

  if (lastRefreshed == null || now == null) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]"
        aria-hidden
      >
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)] opacity-60" />
        canlı
      </span>
    );
  }

  const secAgo = Math.max(0, Math.floor((now - lastRefreshed) / 1000));
  const label =
    secAgo < 60
      ? `${secAgo}sn önce`
      : `${Math.floor(secAgo / 60)}dk önce`;

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]"
      title="Her 30 saniyede bir otomatik yenileniyor"
    >
      <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </span>
      canlı · {label}
    </span>
  );
}
