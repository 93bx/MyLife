import Link from "next/link";

function formatSar(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR`;
}

export function CashBuffer({
  balanceSar,
  cashBufferSar,
}: {
  balanceSar: number | null;
  cashBufferSar: string | null;
}) {
  return (
    <section
      aria-label="Cash and buffer"
      className="space-y-3 rounded border border-border bg-bg-elevated px-4 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Cash + buffer</h2>
        <Link
          href="/money/stats"
          className="text-sm text-text-muted hover:text-accent"
        >
          Money stats →
        </Link>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Balance</dt>
          <dd className="font-mono text-lg">
            {balanceSar === null ? "…" : formatSar(balanceSar)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Buffer target</dt>
          <dd className="font-mono text-lg">{formatSar(cashBufferSar)}</dd>
        </div>
      </dl>
    </section>
  );
}
