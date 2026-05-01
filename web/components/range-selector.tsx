"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import type { RangeMode } from "@/lib/types";

const OPTIONS: { mode: RangeMode; label: string }[] = [
  { mode: "today", label: "Bugün" },
  { mode: "week", label: "Bu hafta" },
  { mode: "month", label: "Bu ay" },
  { mode: "days7", label: "Son 7 gün" },
  { mode: "days30", label: "Son 30 gün" },
  { mode: "all", label: "Tümü" },
];

export function RangeSelector({ current }: { current: RangeMode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <div
      role="tablist"
      aria-label="Zaman aralığı"
      className="inline-flex flex-wrap gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-diffuse)]"
    >
      {OPTIONS.map((o) => {
        const active = o.mode === current;
        const sp = new URLSearchParams(params?.toString() ?? "");
        sp.set("range", o.mode);
        return (
          <Link
            key={o.mode}
            href={`${pathname}?${sp.toString()}`}
            role="tab"
            aria-selected={active}
            scroll={false}
            className="relative rounded-full px-3.5 py-1.5 text-sm font-medium tracking-tight transition active:translate-y-[1px]"
          >
            {active && (
              <motion.span
                layoutId="range-pill"
                className="absolute inset-0 rounded-full bg-[var(--foreground)] shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span
              className={
                "relative z-10 " +
                (active
                  ? "text-[var(--background)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]")
              }
            >
              {o.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
