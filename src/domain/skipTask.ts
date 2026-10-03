export function skipTask(task: { status: string }): { taskStatus: "skipped" } {
  if (task.status !== "open") {
    throw new Error("task is not open");
  }
  return { taskStatus: "skipped" };
}
