import Link from "next/link";

export type FocusTask = {
  id: string;
  title: string;
  priority: string;
};

const PRIORITY_RANK: Record<string, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
};

export function sortFocusTasks(tasks: FocusTask[]): FocusTask[] {
  return [...tasks].sort((a, b) => {
    const ra = PRIORITY_RANK[a.priority] ?? 99;
    const rb = PRIORITY_RANK[b.priority] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title);
  });
}

export function TodayFocus({ tasks }: { tasks: FocusTask[] }) {
  const top = sortFocusTasks(tasks).slice(0, 5);

  return (
    <section
      aria-label="Today focus"
      className="space-y-3 rounded border border-border bg-bg-elevated px-4 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Today focus</h2>
        <Link
          href="/time/plan"
          className="text-sm text-text-muted hover:text-accent"
        >
          Open Plan →
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-text-muted">
          Nothing open for today.{" "}
          <Link href="/time/plan" className="text-accent hover:underline">
            Open Plan
          </Link>{" "}
          to schedule work.
        </p>
      ) : (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {top.map((t) => (
            <li key={t.id} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{t.title}</span>
              <span className="text-text-muted">{t.priority}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
