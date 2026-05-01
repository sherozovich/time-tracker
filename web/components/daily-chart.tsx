"use client";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/types";
import { humanMinutes } from "@/lib/format";

// Desaturated, neutral-biased palette with a single emerald accent as primary.
const PALETTE = [
  "#10b981", // emerald-500 (accent)
  "#0ea5e9", // sky-500
  "#f59e0b", // amber-500
  "#f43f5e", // rose-500
  "#64748b", // slate-500
  "#14b8a6", // teal-500
  "#a855f7", // violet-500
];

const OTHER_COLOR = "#94a3b8"; // slate-400
const BAR_LIGHT = "#0f172a"; // slate-950
const BAR_DARK = "#e2e8f0"; // slate-200

function useChartTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return dark
    ? {
        grid: "#262626",
        axis: "#9ca3af",
        cursor: "rgba(255,255,255,0.06)",
        tooltipBg: "#171717",
        tooltipBorder: "rgba(255,255,255,0.1)",
        tooltipText: "#f5f5f5",
        bar: BAR_DARK,
      }
    : {
        grid: "#e5e7eb",
        axis: "#6b7280",
        cursor: "rgba(0,0,0,0.04)",
        tooltipBg: "#ffffff",
        tooltipBorder: "rgba(0,0,0,0.08)",
        tooltipText: "#171717",
        bar: BAR_LIGHT,
      };
}

export function DailyChart({
  daily,
  stackByProject = false,
  topN = 6,
}: {
  daily: DailyPoint[];
  stackByProject?: boolean;
  topN?: number;
}) {
  const theme = useChartTheme();
  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${theme.tooltipBorder}`,
    backgroundColor: theme.tooltipBg,
    color: theme.tooltipText,
    fontSize: 12,
  };

  if (daily.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Bu dönem için günlük veri yok.
      </p>
    );
  }

  if (!stackByProject) {
    const data = daily.map((d) => ({ day: d.day.slice(5), minutes: Math.round(d.minutes) }));
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="day" stroke={theme.axis} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              stroke={theme.axis}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => humanMinutes(v)}
              width={60}
              fontSize={11}
            />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              formatter={(v) => [humanMinutes(Number(v)), "Süre"]}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="minutes" fill={theme.bar} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Stacked mode: determine top N projects by total
  const totals = new Map<string, number>();
  for (const d of daily) {
    for (const [p, m] of Object.entries(d.byProject)) {
      totals.set(p, (totals.get(p) ?? 0) + m);
    }
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const topProjects = sorted.slice(0, topN).map(([p]) => p);
  const hasOther = sorted.length > topN;

  const keys = hasOther ? [...topProjects, "Diğer"] : topProjects;
  const colorMap = new Map<string, string>();
  topProjects.forEach((p, i) => colorMap.set(p, PALETTE[i % PALETTE.length]));
  if (hasOther) colorMap.set("Diğer", OTHER_COLOR);

  const data = daily.map((d) => {
    const row: Record<string, number | string> = { day: d.day.slice(5) };
    let other = 0;
    for (const [p, m] of Object.entries(d.byProject)) {
      if (topProjects.includes(p)) {
        row[p] = Math.round((row[p] as number ?? 0) + m);
      } else {
        other += m;
      }
    }
    if (hasOther) row["Diğer"] = Math.round(other);
    return row;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="day" stroke={theme.axis} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            stroke={theme.axis}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => humanMinutes(v)}
            width={60}
            fontSize={11}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            formatter={(v, name) => [humanMinutes(Number(v)), String(name)]}
            contentStyle={tooltipStyle}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {keys.map((k, idx) => (
            <Bar
              key={k}
              dataKey={k}
              stackId="a"
              fill={colorMap.get(k)}
              radius={idx === keys.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
