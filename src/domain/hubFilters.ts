export type HubTask = {
  status: string;
  resources: string;
  deadline: string | null;
  tags: string[];
  goalId: string | null;
  projectId: string | null;
};

export type HubProject = { kind: string; origin: string };

export const CAREER_TAGS = ["career", "cert", "brand", "sms", "apply"] as const;

/** Spec default; Profile.timezone overrides when callers pass it. */
export const DEFAULT_TASK_TZ = "Asia/Riyadh";

export function isTimeTask(t: HubTask): boolean {
  return t.resources === "time" || t.resources === "both";
}

export function isMoneyTask(t: HubTask): boolean {
  return t.resources === "money" || t.resources === "both";
}

export function isCareerTask(t: HubTask): boolean {
  return t.tags.some((tag) =>
    (CAREER_TAGS as readonly string[]).includes(tag),
  );
}

export function isOpenTask(t: HubTask): boolean {
  return t.status === "open";
}

/** Calendar YYYY-MM-DD in `timeZone`. Bare `YYYY-MM-DD` deadlines stay as-is. */
export function calendarDayKey(
  isoOrDate: string | Date,
  timeZone: string = DEFAULT_TASK_TZ,
): string {
  if (typeof isoOrDate === "string") {
    const prefix = isoOrDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix) && isoOrDate.length === 10) {
      return prefix;
    }
  }
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isOverdueTask(
  t: HubTask,
  now: Date,
  timeZone: string = DEFAULT_TASK_TZ,
): boolean {
  if (!isOpenTask(t) || t.deadline == null) return false;
  return calendarDayKey(t.deadline, timeZone) < calendarDayKey(now, timeZone);
}

export function isHistoryTask(t: HubTask): boolean {
  return t.status === "done" || t.status === "skipped";
}

export function isFreelanceDeliveryProject(p: HubProject): boolean {
  return (
    p.kind === "delivery" && (p.origin === "personal" || p.origin === "hustle")
  );
}

export function isSmsDeliveryProject(p: HubProject): boolean {
  return p.kind === "delivery" && p.origin === "sms";
}

export function isOpportunityProject(p: HubProject): boolean {
  return p.kind === "opportunity";
}

export function isCareerFacetTask(
  t: HubTask,
  project: HubProject | null | undefined,
): boolean {
  if (isCareerTask(t)) return true;
  if (project == null) return false;
  return isSmsDeliveryProject(project) || isOpportunityProject(project);
}

export function isDueOnDay(
  t: HubTask,
  dayKey: string,
  timeZone: string = DEFAULT_TASK_TZ,
): boolean {
  if (!isOpenTask(t) || t.deadline == null) return false;
  return calendarDayKey(t.deadline, timeZone) === dayKey;
}
