import type { TaskResources } from "./types";

const RIYADH = "Asia/Riyadh";

export type RecurrenceKind = "monthly" | "yearly" | "daily";

export type RecurrenceTemplate = {
  id: string;
  rruleOrKind: RecurrenceKind;
  title: string;
  type: string;
  resources: TaskResources;
  plannedSar: number;
};

/** Calendar date of `asOf` in Asia/Riyadh as YYYY-MM-DD (en-CA). */
function riyadhDate(asOf: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asOf);
}

export function instanceDueFor(kind: RecurrenceKind, asOf: Date): string {
  const ymd = riyadhDate(asOf);
  const [y, m] = ymd.split("-");
  if (kind === "monthly") return `${y}-${m}-01`;
  if (kind === "yearly") return `${y}-01-01`;
  return ymd;
}

export function neededInstance(
  template: RecurrenceTemplate,
  asOf: Date,
  existingDueForDates: string[],
): { dueFor: string; title: string } | null {
  const dueFor = instanceDueFor(template.rruleOrKind, asOf);
  if (existingDueForDates.includes(dueFor)) return null;
  return { dueFor, title: template.title };
}
