import { completeMoneyTask, type MoneyTask } from "./money";
import type { TaskResources } from "./types";

export function completeTaskService(
  task: MoneyTask & { resources: TaskResources },
  body: { actualSar?: number },
) {
  if (task.resources === "time") {
    return { taskStatus: "done" as const, transaction: null };
  }
  if (body.actualSar === undefined) {
    throw new Error("actualSar required");
  }
  return completeMoneyTask(task, body.actualSar);
}
