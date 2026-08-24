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
