import Link from "next/link";

export type StripBlock = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
};

function formatDayTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function findNextBlockId(
  blocks: StripBlock[],
  now: Date = new Date(),
): string | null {
  const upcoming = blocks
    .filter((b) => new Date(b.startAt).getTime() > now.getTime())
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  return upcoming[0]?.id ?? null;
}

export function CalendarStrip({
  blocks,
  now = new Date(),
}: {
  blocks: StripBlock[];
  now?: Date;
}) {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const nextId = findNextBlockId(sorted, now);

  return (
    <section
      aria-label="Calendar"
      className="space-y-3 rounded border border-border bg-bg-elevated px-4 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Calendar</h2>
        <Link
          href="/time/calendar"
          className="text-sm text-text-muted hover:text-accent"
        >
          Open Calendar →
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-text-muted">
          No blocks in the next few days.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {sorted.map((b) => {
            const isNext = b.id === nextId;
            return (
              <li
                key={b.id}
                className={
                  isNext
                    ? "rounded border border-accent/50 bg-bg px-3 py-2"
                    : "px-1 py-1"
                }
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  {isNext ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-accent">
                      Next
                    </span>
                  ) : null}
                  <span className="font-medium">{b.title}</span>
                </div>
                <p className="font-mono text-text-muted">
                  {formatDayTime(b.startAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
