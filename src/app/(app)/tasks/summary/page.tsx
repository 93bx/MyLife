"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { isOpenTask, type HubTask } from "@/domain/hubFilters";
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
  tags?: unknown;
  goalId: string | null;
  projectId: string | null;
};

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toHubTask(t: TaskRow): HubTask {
  return {
    status: t.status,
    resources: t.resources,
    deadline: t.deadline,
    tags: parseTags(t.tags),
    goalId: t.goalId,
    projectId: t.projectId,
  };
}

export default function TasksSummaryPage() {
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

  const openTasks = useMemo(
    () => tasks.filter((t) => isOpenTask(toHubTask(t))),
    [tasks],
  );

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
    <div className="space-y-6">
      <HubHeader
        title="Summary"
        description="All open tasks. Money completions belong on Money (confirm SAR)."
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {openTasks.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">No open tasks.</li>
        ) : (
          openTasks.map((t) => (
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
    </div>
  );
}
