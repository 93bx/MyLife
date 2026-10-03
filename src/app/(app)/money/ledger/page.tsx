"use client";

import { useCallback, useEffect, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { apiJson } from "@/lib/apiClient";

type TxnRow = {
  id: string;
  direction: string;
  amountSar: string;
  at: string;
  category: string | null;
  taskId: string | null;
};

export default function MoneyLedgerPage() {
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const moneyRes = await apiJson<{
      balanceSar: number;
      transactions: TxnRow[];
    }>("/api/money");

    if (!moneyRes.ok) {
      setLoadError(moneyRes.error);
      return;
    }
    setTransactions(moneyRes.data.transactions);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <HubHeader
        title="Ledger"
        description="Transaction history from cash movements."
      />

      {loadError ? <p className="text-sm text-danger">{loadError}</p> : null}

      <ul className="divide-y divide-border border border-border">
        {transactions.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            No transactions yet.
          </li>
        ) : (
          transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>
                {tx.direction}{" "}
                <span className="font-mono">{tx.amountSar}</span> SAR
                {tx.category ? ` · ${tx.category}` : ""}
              </span>
              <span className="font-mono text-text-muted">
                {new Date(tx.at).toLocaleString()}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
