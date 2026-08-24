import type { TaskResources } from "./types";

export type MoneyTask = {
  id: string;
  resources: TaskResources;
  status: string;
  type: string;
};

export function completeMoneyTask(task: MoneyTask, actualSar: number) {
  if (task.resources === "time") {
    throw new Error("time-only tasks cannot post money");
  }
  if (!Number.isFinite(actualSar)) {
    throw new Error("actualSar must be a finite number");
  }
  const direction = task.type === "confirm_income" ? "in" : "out";
  return {
    taskStatus: "done" as const,
    transaction: { direction, amountSar: actualSar, taskId: task.id },
  };
}

export function cashBalance(txns: { direction: "in" | "out"; amountSar: number }[]) {
  return txns.reduce(
    (sum, t) => sum + (t.direction === "in" ? t.amountSar : -t.amountSar),
    0,
  );
}
