import Link from "next/link";
import type { AttentionItem } from "@/domain/dashboardAttention";

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <section
      aria-label="Needs attention"
      className="space-y-3 rounded border border-border bg-bg-elevated px-4 py-4"
    >
      <h2 className="text-lg font-medium">Needs attention</h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing needs attention.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="text-warning hover:underline"
              >
                {item.label}
              </Link>
              <span className="ml-2 text-xs text-text-muted">
                {item.kind.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
