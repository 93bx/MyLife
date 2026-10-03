"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function TasksSummaryInner() {
  const searchParams = useSearchParams();
  const priorityFilter = searchParams.get("priority");

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

  const openTasks = useMemo(() => {
    let list = tasks.filter((t) => isOpenTask(toHubTask(t)));
    if (priorityFilter) {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    return list;
  }, [tasks, priorityFilter]);

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

  async function skipTaskRow(id: string) {
    setBusyId(id);
    const res = await apiJson(`/api/tasks/${id}/skip`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void load();
  }

  const description = priorityFilter
    ? `Open tasks filtered to priority ${priorityFilter}. Money completions belong on Money (confirm SAR).`
    : "All open tasks. Money completions belong on Money (confirm SAR).";

  return (
    <div className="space-y-6">
      <HubHeader title="Summary" description={description} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {openTasks.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            {priorityFilter
              ? `No open ${priorityFilter} tasks.`
              : "No open tasks."}
          </li>
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
              <div className="flex gap-2">
                {t.resources === "time" ? (
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => void completeTimeTask(t.id)}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                  >
                    Complete
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => void skipTaskRow(t.id)}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function TasksSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <HubHeader
            title="Summary"
            description="All open tasks. Money completions belong on Money (confirm SAR)."
          />
          <p className="text-sm text-text-muted">Loading…</p>
        </div>
      }
    >
      <TasksSummaryInner />
    </Suspense>
  );
}
