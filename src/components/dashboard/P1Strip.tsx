import Link from "next/link";

export type P1Task = {
  id: string;
  title: string;
};

export function P1Strip({ tasks }: { tasks: P1Task[] }) {
  const top = tasks.slice(0, 5);

  return (
    <section
      aria-label="P1 tasks"
      className="space-y-3 rounded border border-border bg-bg-elevated px-4 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">P1</h2>
        <Link
          href="/tasks/summary"
          className="text-sm text-text-muted hover:text-accent"
        >
          Tasks summary →
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-text-muted">No open P1 tasks.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {top.map((t) => (
            <li
              key={t.id}
              className="rounded border border-danger/40 px-3 py-2 text-sm text-danger"
            >
              P1 · {t.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
