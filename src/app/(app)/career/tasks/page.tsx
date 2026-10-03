"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import {
  isCareerFacetTask,
  type HubProject,
  type HubTask,
} from "@/domain/hubFilters";
import { normalizeTagList } from "@/domain/taskTags";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  resources: string;
  deadline: string | null;
  tags: unknown;
  goalId: string | null;
  projectId: string | null;
};

type ProjectRow = { id: string; kind: string; origin: string };

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

export default function CareerTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const [tRes, pRes] = await Promise.all([
      apiJson<{ tasks: TaskRow[] }>("/api/tasks"),
      apiJson<{ projects: ProjectRow[] }>("/api/projects"),
    ]);
    if (!tRes.ok) {
      setLoadError(tRes.error);
      return;
    }
    if (!pRes.ok) {
      setLoadError(pRes.error);
      return;
    }
    setTasks(tRes.data.tasks);
    setProjects(pRes.data.projects);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projectById = useMemo(() => {
    const m = new Map<string, HubProject>();
    for (const p of projects) {
      m.set(p.id, { kind: p.kind, origin: p.origin });
    }
    return m;
  }, [projects]);

  const careerTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status !== "open") return false;
        const hub = toHubTask(t);
        const proj =
          t.projectId != null ? (projectById.get(t.projectId) ?? null) : null;
        return isCareerFacetTask(hub, proj);
      }),
    [tasks, projectById],
  );

  async function skip(id: string) {
    setBusyId(id);
    const res = await apiJson(`/api/tasks/${id}/skip`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    void load();
  }

  async function completeTimeTask(id: string) {
    setBusyId(id);
    const res = await apiJson(`/api/tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusyId(null);
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    void load();
  }

  return (
    <div className="flex flex-col gap-4">
      <HubHeader
        title="Career tasks"
        description="Career-tagged tasks, plus tasks linked to SMS deliveries or opportunities."
      />
      {loadError ? (
        <p className="text-sm text-danger">Load error: {loadError}</p>
      ) : null}
      {careerTasks.length === 0 ? (
        <p className="text-sm text-text-muted">No career tasks yet.</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {careerTasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <span className="font-medium">{t.title}</span>
                <div className="text-text-muted">
                  {t.resources}
                  {normalizeTagList(t.tags).length
                    ? ` · ${normalizeTagList(t.tags).join(", ")}`
                    : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
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
                  onClick={() => void skip(t.id)}
                  className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
