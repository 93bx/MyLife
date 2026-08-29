"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  resources: string;
  estimateMinutes: number | null;
  plannedSar: string | null;
  floating: boolean;
  deadline: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiJson<{ tasks: TaskRow[] }>("/api/tasks");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setTasks(res.data.tasks);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function completeTimeTask(id: string) {
    setBusyId(id);
    const res = await apiJson(`/api/tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void load();
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-text-muted">
          All tasks. Money completions belong on Money (confirm SAR).
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {tasks.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">No tasks yet.</li>
        ) : (
          tasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-text-muted">
                  {t.status} · {t.type} · {t.priority} · {t.resources}
                  {t.floating ? " · floating" : ""}
                  {t.plannedSar != null ? (
                    <>
                      {" · planned "}
                      <span className="font-mono">{t.plannedSar}</span> SAR
                    </>
                  ) : null}
                </div>
              </div>
              {t.status === "open" && t.resources === "time" ? (
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => void completeTimeTask(t.id)}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                >
                  Complete
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
