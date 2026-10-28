/** PROTOTYPE — throwaway Dashboard layout variants. Not production. */

const SAMPLE = {
  cashSar: 420,
  bufferTarget: 500,
  focus: "Ship Tijarah fix",
  idlePush: "Cert chapter · 25m",
  nextBlock: { time: "14:00", title: "Focus", minutes: 45 },
  p1s: ["Confirm salary", "Apply draft"],
  overdue: 2,
  cashLogged: false,
};

function IconAlert({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 2.5L14 13H2L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function VariantA() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-text-muted">Prototype · Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">A — Attention ribbon</h1>
      </header>

      <section
        aria-label="Needs attention"
        className="rounded-sm border border-warning/40 border-l-[3px] border-l-warning bg-bg-elevated px-4 py-3"
      >
        <div className="flex items-center gap-2 text-warning">
          <IconAlert />
          <h2 className="text-sm font-medium">Needs attention</h2>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {SAMPLE.overdue} overdue · cash not logged today
        </p>
      </section>

      <section
        aria-label="Glance metrics"
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-sm border border-border bg-bg-elevated p-4">
          <h2 className="text-xs uppercase tracking-wide text-text-muted">Cash</h2>
          <p className="mt-2 font-mono text-2xl tabular-nums">{SAMPLE.cashSar} SAR</p>
          <p className="mt-1 text-sm text-text-muted">
            buffer &lt; {SAMPLE.bufferTarget}
          </p>
        </div>
        <div className="rounded-sm border border-border bg-bg-elevated p-4">
          <h2 className="text-xs uppercase tracking-wide text-text-muted">Next block</h2>
          <p className="mt-2 text-lg text-accent">
            {SAMPLE.nextBlock.time} · {SAMPLE.nextBlock.title}
          </p>
          <p className="mt-1 font-mono text-sm text-text-muted">
            {SAMPLE.nextBlock.minutes}m owned
          </p>
        </div>
        <div className="rounded-sm border border-accent/40 bg-bg-elevated p-4">
          <h2 className="text-xs uppercase tracking-wide text-text-muted">Today focus</h2>
          <p className="mt-2 text-lg font-medium">{SAMPLE.focus}</p>
          <p className="mt-1 text-sm text-text-muted">then {SAMPLE.idlePush}</p>
        </div>
      </section>

      <section aria-label="P1 tasks" className="rounded-sm border border-border bg-bg-elevated p-3">
        <h2 className="sr-only">P1 strip</h2>
        <ul className="flex flex-wrap gap-2">
          {SAMPLE.p1s.map((t) => (
            <li
              key={t}
              className="rounded-sm border border-danger/40 px-3 py-2 text-sm text-danger"
            >
              P1 · {t}
            </li>
          ))}
          <li>
            <a
              href="/time/plan"
              className="inline-flex cursor-pointer rounded-sm border border-border px-3 py-2 text-sm text-text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              Open Plan →
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

export function VariantB() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-text-muted">Prototype · Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">B — Two-rail cockpit</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section
          aria-label="Today focus"
          className="rounded-sm border border-accent/40 bg-bg-elevated p-5"
        >
          <h2 className="text-xs uppercase tracking-wide text-text-muted">Today focus</h2>
          <p className="mt-3 text-2xl font-semibold">{SAMPLE.focus}</p>
          <p className="mt-2 text-text-muted">Idle push: {SAMPLE.idlePush}</p>
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-sm text-text-muted">P1 sequence</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {SAMPLE.p1s.map((t, i) => (
                <li
                  key={t}
                  className={i === 0 ? "text-danger" : "text-accent"}
                >
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <section className="rounded-sm border border-border bg-bg-elevated p-4">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">Cash</h2>
            <p className="mt-2 font-mono text-3xl tabular-nums">{SAMPLE.cashSar}</p>
            <p className="mt-1 text-sm text-warning">buffer thin</p>
          </section>
          <section className="rounded-sm border border-border bg-bg-elevated p-4">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">Next</h2>
            <p className="mt-2">
              {SAMPLE.nextBlock.time} {SAMPLE.nextBlock.title} ·{" "}
              <span className="font-mono">{SAMPLE.nextBlock.minutes}m</span>
            </p>
          </section>
          <section className="flex-1 rounded-sm border border-warning/40 bg-bg-elevated p-4">
            <h2 className="flex items-center gap-2 text-xs uppercase tracking-wide text-warning">
              <IconAlert /> Attention
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-text-muted">
              <li>{SAMPLE.overdue} overdue</li>
              <li>cash unlogged</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function VariantC() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Prototype · Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">C — Timeline-first</h1>
          <p className="mt-1 text-sm text-text-muted">Sat 3 Oct · day spine</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl tabular-nums">{SAMPLE.cashSar} SAR</p>
          <p className="text-xs text-warning">needs cash log</p>
        </div>
      </header>

      <section aria-label="Day spine" className="border-l-2 border-border pl-5">
        <ol className="space-y-4">
          <li className="text-sm text-text-muted">09:30 · SMS start</li>
          <li className="-ml-[1.4rem] rounded-sm border border-accent border-l-[3px] bg-bg-elevated px-4 py-3">
            <h2 className="font-medium">
              {SAMPLE.nextBlock.time} · Focus block
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {SAMPLE.focus} · {SAMPLE.nextBlock.minutes}m
            </p>
          </li>
          <li className="text-sm text-text-muted">17:30 · Day end</li>
          <li className="text-sm text-text-muted">Tonight · on</li>
        </ol>
      </section>

      <section aria-label="Chips" className="flex flex-wrap gap-2">
        <span className="rounded-sm border border-danger/40 px-3 py-2 text-sm text-danger">
          P1 × {SAMPLE.p1s.length}
        </span>
        <span className="rounded-sm border border-warning/40 px-3 py-2 text-sm text-warning">
          {SAMPLE.overdue} overdue
        </span>
        <a
          href="/time/plan"
          className="cursor-pointer rounded-sm border border-border px-3 py-2 text-sm text-text-muted transition-colors duration-200 hover:text-accent"
        >
          Open Plan →
        </a>
      </section>
    </div>
  );
}
