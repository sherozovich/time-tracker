"use client";
import { motion, type Variants } from "framer-motion";

type StatItem = { label: string; value: string; hint?: string };

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <motion.dl
      className="grid grid-cols-1 divide-y divide-[var(--border)] rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-diffuse)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {items.map((it) => (
        <motion.div
          key={it.label}
          variants={item}
          className="flex flex-col gap-1.5 px-6 py-6 sm:px-8 sm:py-7"
        >
          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            {it.label}
          </dt>
          <dd className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
            {it.value}
          </dd>
          {it.hint ? (
            <span className="text-xs text-[var(--muted)]">{it.hint}</span>
          ) : null}
        </motion.div>
      ))}
    </motion.dl>
  );
}
