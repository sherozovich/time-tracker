"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { humanMinutes } from "@/lib/format";
import { projectSlug } from "@/lib/slug";
import { MotionList, MotionItem } from "@/components/motion/motion-list";
import type { ProjectTotal } from "@/lib/types";

export function ProjectBarList({
  projects,
  total,
}: {
  projects: ProjectTotal[];
  total: number;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">Bu dönem için veri yok.</p>
    );
  }
  const max = projects[0]?.minutes ?? 1;

  return (
    <MotionList className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-bento)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-diffuse)]">
      {projects.map((p) => {
        const pct = (p.minutes / max) * 100;
        const share = total > 0 ? (p.minutes / total) * 100 : 0;
        return (
          <MotionItem key={p.project} layoutId={`proj-${p.project}`}>
            <Link
              href={`/projects/${projectSlug(p.project)}`}
              className="group block px-6 py-5 transition active:translate-y-[1px]"
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-medium tracking-tight text-[var(--foreground)]">
                  {p.project}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--foreground)]">
                  {humanMinutes(p.minutes)}
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    %{share.toFixed(0)}
                  </span>
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <motion.div
                  className="h-full rounded-full bg-[var(--foreground)] group-hover:bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 22,
                    delay: 0.1,
                  }}
                />
              </div>
              <div className="mt-2 font-mono text-[11px] tracking-wide text-[var(--muted)]">
                {p.sessionCount} oturum
              </div>
            </Link>
          </MotionItem>
        );
      })}
    </MotionList>
  );
}
