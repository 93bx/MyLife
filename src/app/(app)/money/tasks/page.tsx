"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { parseActualSarInput } from "@/domain/money";
import { isMoneyTask, isOpenTask } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  resources: string;
  plannedSar: string | null;
  deadline: string | null;
  tags: string | string[];
  goalId: string | null;
  projectId: string | null;
};

function parseTags(raw: string | string[]): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === "string");
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}

function toHubTask(t: TaskRow) {
  return {
    status: t.status,
    resources: t.resources,
    deadline: t.deadline,
    tags: parseTags(t.tags),
    goalId: t.goalId,
    projectId: t.projectId,
  };
}

export default function MoneyTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const tasksRes = await apiJson<{ tasks: TaskRow[] }>("/api/tasks");
    if (!tasksRes.ok) {
      setError(tasksRes.error);
      return;
    }
    setError(null);
    setTasks(tasksRes.data.tasks);

    const next: Record<string, string> = {};
    for (const t of tasksRes.data.tasks) {
      const hub = toHubTask(t);
      if (isOpenTask(hub) && isMoneyTask(hub)) {
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
      tasks.filter((t) => {
        const hub = toHubTask(t);
        return isOpenTask(hub) && isMoneyTask(hub);
      }),
    [tasks],
  );

  async function completePay(id: string) {
    const parsed = parseActualSarInput(amounts[id]);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusyId(id);
    const res = await apiJson(`/api/tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ actualSar: parsed.value }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void load();
  }

  return (
    <div className="space-y-6">
      <HubHeader
        title="Tasks"
        description="Open money tasks — resources money or both."
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {dueMoney.length === 0 ? (
        <p className="text-sm text-text-muted">None open.</p>
      ) : (
        <ul className="space-y-3">
          {dueMoney.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-end gap-3 border border-border bg-bg-elevated px-3 py-3 text-sm"
            >
              <div className="min-w-[12rem] flex-1">
                <div className="font-medium">{t.title}</div>
                <div className="text-text-muted">
                  {t.type} · planned{" "}
                  <span className="font-mono">{t.plannedSar ?? "—"}</span> SAR
                </div>
              </div>
              <label className="flex flex-col gap-1 text-text-muted">
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
                  className="w-32 rounded border border-border bg-bg px-2 py-1 font-mono text-text outline-none focus:border-accent"
                />
              </label>
              <button
                type="button"
                disabled={busyId === t.id}
                onClick={() => void completePay(t.id)}
                className="rounded bg-accent px-3 py-2 font-medium text-bg hover:bg-accent-muted hover:text-text disabled:opacity-50"
              >
                Complete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
