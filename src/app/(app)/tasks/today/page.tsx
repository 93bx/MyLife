"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import {
  DEFAULT_TASK_TZ,
  calendarDayKey,
  isDueOnDay,
  type HubTask,
} from "@/domain/hubFilters";
import { normalizeTagList } from "@/domain/taskTags";
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

function toHubTask(t: TaskRow): HubTask {
  return {
    status: t.status,
    resources: t.resources,
    deadline: t.deadline,
    tags: normalizeTagList(t.tags),
    goalId: t.goalId,
    projectId: t.projectId,
  };
}

export default function TasksTodayPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [timezone, setTimezone] = useState(DEFAULT_TASK_TZ);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const dayKey = calendarDayKey(new Date(), timezone);
  const todayTasks = useMemo(
    () =>
      tasks.filter((t) => isDueOnDay(toHubTask(t), dayKey, timezone)),
    [tasks, dayKey, timezone],
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

  return (
    <div className="space-y-6">
      <HubHeader
        title="Today"
        description={`Open tasks due today (${timezone}).`}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {todayTasks.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            Nothing due today.
          </li>
        ) : (
          todayTasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-text-muted">
                  {t.priority} · {t.resources} · {t.type}
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
