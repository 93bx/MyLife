export type InstanceSummary = { dueFor: string; status: string } | null;

export function pickLatestInstance(
  rows: { dueFor: string | null; status: string }[],
): InstanceSummary {
  let best: { dueFor: string; status: string } | null = null;
  for (const row of rows) {
    if (row.dueFor == null) continue;
    if (best == null || row.dueFor > best.dueFor) {
      best = { dueFor: row.dueFor, status: row.status };
    }
  }
  return best;
}
