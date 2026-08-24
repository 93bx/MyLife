import type { TaskResources } from "./types";

export type MoneyTask = {
  id: string;
  resources: TaskResources;
  status: string;
  type: string;
};

/** Parse Actual SAR from a form field. Rejects blank (Number("") === 0). */
export function parseActualSarInput(
  raw: string | undefined | null,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") {
    return {
      ok: false,
      error: "Actual SAR is required. Enter a finite number.",
    };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      error: "Actual SAR must be a finite number.",
    };
  }
  return { ok: true, value };
}

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
