"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { apiJson } from "@/lib/apiClient";

type ProfileRow = {
  cashBufferSar: string | null;
};

function formatSar(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR`;
}

export default function MoneyStatsPage() {
  const [balanceSar, setBalanceSar] = useState<number | null>(null);
  const [bufferSar, setBufferSar] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const [moneyRes, profileRes] = await Promise.all([
      apiJson<{ balanceSar: number }>("/api/money"),
      apiJson<{ profile: ProfileRow }>("/api/profile"),
    ]);

    if (moneyRes.ok) setBalanceSar(moneyRes.data.balanceSar);
    else setLoadError(moneyRes.error);

    if (profileRes.ok) setBufferSar(profileRes.data.profile.cashBufferSar);
    else setLoadError((prev) => prev ?? profileRes.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <HubHeader
        title="Stats"
        description="Cash balance and buffer target."
        action={
          <Link
            href="/money/ledger"
            className="text-sm text-text-muted hover:text-accent"
          >
            Ledger →
          </Link>
        }
      />

      {loadError ? <p className="text-sm text-danger">{loadError}</p> : null}

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Balance</dt>
          <dd className="font-mono text-2xl">
            {balanceSar === null ? "…" : formatSar(balanceSar)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Buffer target</dt>
          <dd className="font-mono text-2xl">{formatSar(bufferSar)}</dd>
        </div>
      </dl>
    </div>
  );
}
