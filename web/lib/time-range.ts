import type { RangeMode } from "./types";
import { TZ } from "./paths";

type ResolvedRange = {
  since: Date;
  until: Date;
  label: string;
  mode: RangeMode;
};

// Dönüştürücü: UTC Date -> yerel saatte start/end of day
function localDayBounds(d: Date): { startUtc: Date; endUtc: Date } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.format(d); // YYYY-MM-DD
  const [y, m, day] = parts.split("-").map(Number);
  // Istanbul is UTC+3 year-round (no DST). Hardcode:
  const startUtc = new Date(Date.UTC(y, m - 1, day, -3, 0, 0, 0)); // 00:00 local = 21:00 previous day UTC
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);
  return { startUtc, endUtc };
}

function localWeekStartUtc(d: Date): Date {
  // Monday as week start
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  });
  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const name = fmt.format(d);
  const off = weekdayMap[name] ?? 0;
  const { startUtc } = localDayBounds(d);
  return new Date(startUtc.getTime() - off * 24 * 3600 * 1000);
}

function localMonthStartUtc(d: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m] = fmt.format(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, -3, 0, 0, 0));
}

export function resolveRange(mode: RangeMode, now: Date = new Date()): ResolvedRange {
  const until = new Date(now.getTime() + 1); // inclusive for "now"
  switch (mode) {
    case "today": {
      const { startUtc } = localDayBounds(now);
      return { since: startUtc, until, label: "Bugün", mode };
    }
    case "week": {
      const since = localWeekStartUtc(now);
      return { since, until, label: "Bu hafta", mode };
    }
    case "month": {
      const since = localMonthStartUtc(now);
      const monthFmt = new Intl.DateTimeFormat("tr-TR", {
        timeZone: TZ,
        year: "numeric",
        month: "long",
      });
      return { since, until, label: `${monthFmt.format(now)}`, mode };
    }
    case "days7": {
      const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      return { since, until, label: "Son 7 gün", mode };
    }
    case "days30": {
      const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      return { since, until, label: "Son 30 gün", mode };
    }
    case "all":
    default:
      return {
        since: new Date(0),
        until,
        label: "Tüm zamanlar",
        mode: "all",
      };
  }
}

export function isRangeMode(v: string | null | undefined): v is RangeMode {
  return (
    v === "today" ||
    v === "week" ||
    v === "month" ||
    v === "days7" ||
    v === "days30" ||
    v === "all"
  );
}
