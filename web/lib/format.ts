export function humanMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}dk`;
  return `${h}s ${m.toString().padStart(2, "0")}dk`;
}

export function humanDateRange(since: Date, until: Date): string {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
  });
  return `${fmt.format(since)} — ${fmt.format(new Date(until.getTime() - 1))}`;
}
