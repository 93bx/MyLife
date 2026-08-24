export type PlanTask = {
  id: string;
  type: string;
  estimateMinutes: number;
  floating?: boolean;
};

export function partitionSmsFirst(tasks: PlanTask[]): {
  sms: PlanTask[];
  extra: PlanTask[];
} {
  const sms: PlanTask[] = [];
  const extra: PlanTask[] = [];
  for (const task of tasks) {
    if (task.type === "sms") sms.push(task);
    else extra.push(task);
  }
  return { sms, extra };
}

export function overloadWarning(
  totalMinutes: number,
  capacityMinutes: number,
): boolean {
  return totalMinutes > capacityMinutes;
}

/** Minutes between HH:MM work times. Invalid/empty → 480 (09:30–17:30 default). */
export function workdayCapacityMinutes(
  workStart: string,
  workEnd: string,
): number {
  const start = parseHm(workStart);
  const end = parseHm(workEnd);
  if (start == null || end == null || end <= start) return 480;
  return end - start;
}

function parseHm(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
