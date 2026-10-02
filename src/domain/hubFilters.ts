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

function utcDayKey(isoOrDate: string | Date): string {
  if (typeof isoOrDate === "string") {
    const prefix = isoOrDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return prefix;
  }
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isOverdueTask(t: HubTask, now: Date): boolean {
  if (!isOpenTask(t) || t.deadline == null) return false;
  return utcDayKey(t.deadline) < utcDayKey(now);
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
