"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  resources: string;
  plannedSar: string | null;
};

type TxnRow = {
  id: string;
  direction: string;
  amountSar: string;
  at: string;
  category: string | null;
  taskId: string | null;
};

export default function MoneyPage() {
  const [balanceSar, setBalanceSar] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TxnRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [moneyRes, tasksRes] = await Promise.all([
      apiJson<{ balanceSar: number; transactions: TxnRow[] }>("/api/money"),
      apiJson<{ tasks: TaskRow[] }>("/api/tasks"),
    ]);
    if (!moneyRes.ok) {
      setError(moneyRes.error);
      return;
    }
    if (!tasksRes.ok) {
      setError(tasksRes.error);
      return;
    }
    setError(null);
    setBalanceSar(moneyRes.data.balanceSar);
    setTransactions(moneyRes.data.transactions);
    setTasks(tasksRes.data.tasks);

    const next: Record<string, string> = {};
    for (const t of tasksRes.data.tasks) {
      if (
        t.status === "open" &&
        (t.resources === "money" || t.resources === "both")
      ) {
        next[t.id] = t.plannedSar ?? "";
      }
    }
    setAmounts(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dueMoney = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "open" &&
          (t.resources === "money" || t.resources === "both"),
      ),
    [tasks],
  );

  async function completePay(id: string) {
    const raw = amounts[id];
    const actualSar = Number(raw);
    if (!Number.isFinite(actualSar)) {
      setError("Enter a valid SAR amount");
      return;
    }
    setBusyId(id);
    const res = await apiJson(`/api/tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ actualSar }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void load();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Money</h1>
        <p className="text-sm text-neutral-600">
          Balance, transactions, and confirm actual SAR on money tasks (M2).
        </p>
      </div>

      <p className="text-lg">
        Balance:{" "}
        <strong>
          {balanceSar === null
            ? "…"
            : `${balanceSar.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR`}
        </strong>
      </p>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Due money tasks</h2>
        {dueMoney.length === 0 ? (
          <p className="text-sm text-neutral-500">None open.</p>
        ) : (
          <ul className="space-y-3">
            {dueMoney.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-end gap-3 border border-neutral-300 px-3 py-3 text-sm"
              >
                <div className="min-w-[12rem] flex-1">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-neutral-500">
                    {t.type} · planned {t.plannedSar ?? "—"} SAR
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  Actual SAR
                  <input
                    type="number"
                    step="0.01"
                    value={amounts[t.id] ?? ""}
                    onChange={(e) =>
                      setAmounts((prev) => ({
                        ...prev,
                        [t.id]: e.target.value,
                      }))
                    }
                    className="w-32 rounded border border-neutral-400 bg-white px-2 py-1"
                  />
                </label>
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => void completePay(t.id)}
                  className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
                >
                  Complete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Transactions</h2>
        <ul className="divide-y divide-neutral-200 border border-neutral-300">
          {transactions.length === 0 ? (
            <li className="px-3 py-4 text-sm text-neutral-500">
              No transactions yet.
            </li>
          ) : (
            transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>
                  {tx.direction} {tx.amountSar} SAR
                  {tx.category ? ` · ${tx.category}` : ""}
                </span>
                <span className="text-neutral-500">
                  {new Date(tx.at).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
