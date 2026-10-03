"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { isCareerTask } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  resources: string;
  deadline: string | null;
  tags: string | string[];
  goalId: string | null;
  projectId: string | null;
};

function normalizeTags(raw: string | string[]): string[] {
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

export default function CareerTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await apiJson<{ tasks: TaskRow[] }>("/api/tasks");
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    setTasks(res.data.tasks);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const careerTasks = useMemo(
    () =>
      tasks.filter((t) =>
        isCareerTask({
          status: t.status,
          resources: t.resources,
          deadline: t.deadline,
          tags: normalizeTags(t.tags),
          goalId: t.goalId,
          projectId: t.projectId,
        }),
      ),
    [tasks],
  );

  return (
    <div className="flex flex-col gap-4">
      <HubHeader
        title="Career tasks"
        description="Tasks tagged career, cert, brand, sms, or apply."
      />
      {loadError ? (
        <p className="text-sm text-danger">Load error: {loadError}</p>
      ) : null}
      {careerTasks.length === 0 ? (
        <p className="text-sm text-text-muted">No career-tagged tasks yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {careerTasks.map((t) => (
            <li key={t.id} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{t.title}</span>
              <span className="text-text-muted">{t.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
