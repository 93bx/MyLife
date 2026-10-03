"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import {
  DEFAULT_TASK_TZ,
  isOverdueTask,
  type HubTask,
} from "@/domain/hubFilters";
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

export default function TasksOverduePage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [timezone, setTimezone] = useState(DEFAULT_TASK_TZ);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tasksRes, profileRes] = await Promise.all([
      apiJson<{ tasks: TaskRow[] }>("/api/tasks"),
      apiJson<{ profile: { timezone?: string } }>("/api/profile"),
    ]);
    if (!tasksRes.ok) {
      setError(tasksRes.error);
      return;
    }
    setError(null);
    setTasks(tasksRes.data.tasks);
    if (profileRes.ok) {
      setTimezone(profileRes.data.profile.timezone ?? DEFAULT_TASK_TZ);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overdue = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => isOverdueTask(toHubTask(t), now, timezone));
  }, [tasks, timezone]);

  return (
    <div className="space-y-6">
      <HubHeader
        title="Overdue"
        description={`Open tasks past their deadline (start of today in ${timezone}).`}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {overdue.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">None overdue.</li>
        ) : (
          overdue.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-text-muted">
                  {t.priority} · {t.resources}
                  {t.deadline != null ? (
                    <>
                      {" · due "}
                      <span className="font-mono">{t.deadline.slice(0, 10)}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
