/** True when today has no direction=out cash log date. */
export function needsCashPing(
  todayDate: string,
  cashOutDates: string[],
): boolean {
  return !cashOutDates.includes(todayDate);
}

const RIYADH = "Asia/Riyadh";

/** Calendar date of `asOf` in Asia/Riyadh as YYYY-MM-DD (en-CA). */
export function riyadhToday(asOf: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asOf);
}

/** True if local Riyadh time is strictly after 17:30 (work end). */
export function isAfterCashPingTime(asOf: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RIYADH,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(asOf);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour > 17 || (hour === 17 && minute > 30);
}

export function cashOutDatesFromTransactions(
  txns: { direction: string; at: Date | string }[],
): string[] {
  const dates = new Set<string>();
  for (const t of txns) {
    if (t.direction !== "out") continue;
    const at = typeof t.at === "string" ? new Date(t.at) : t.at;
    dates.add(riyadhToday(at));
  }
  return [...dates];
}
