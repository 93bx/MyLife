export type AttentionItem = {
  id: string;
  kind: "overdue_task" | "unlogged_cash" | "doc_expiry";
  label: string;
  href: string;
};

export function buildAttentionItems(input: {
  overdueTasks: { id: string; title: string }[];
  showCashPing: boolean;
  docExpiries?: { id: string; label: string; href: string }[];
}): AttentionItem[] {
  const items: AttentionItem[] = input.overdueTasks.map((task) => ({
    id: task.id,
    kind: "overdue_task",
    label: task.title,
    href: "/tasks/overdue",
  }));

  if (input.showCashPing) {
    items.push({
      id: "cash-ping",
      kind: "unlogged_cash",
      label: "No cash logged today",
      href: "/money/cash-ping",
    });
  }

  for (const doc of input.docExpiries ?? []) {
    items.push({
      id: doc.id,
      kind: "doc_expiry",
      label: doc.label,
      href: doc.href,
    });
  }

  return items;
}
