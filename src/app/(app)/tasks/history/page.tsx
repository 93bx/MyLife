"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { isHistoryTask, type HubTask } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  resources: string;
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

export default function TasksHistoryPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const history = useMemo(
    () => tasks.filter((t) => isHistoryTask(toHubTask(t))),
    [tasks],
  );

  return (
    <div className="space-y-6">
      <HubHeader
        title="History"
        description="Done and skipped tasks."
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {history.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">No history yet.</li>
        ) : (
          history.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-text-muted">
                  {t.status} · {t.type} · {t.priority} · {t.resources}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
