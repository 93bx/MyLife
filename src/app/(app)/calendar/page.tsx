"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  floating: boolean;
  deadline: string | null;
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
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

  const grouped = useMemo(() => {
    const scheduled = tasks.filter(
      (t) => !t.floating && t.deadline != null && t.status !== "skipped",
    );
    const map = new Map<string, TaskRow[]>();
    for (const t of scheduled) {
      const key = dayKey(t.deadline!);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-neutral-600">
          Scheduled (non-floating) tasks by deadline. No Google in v1.
        </p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {grouped.length === 0 ? (
        <p className="text-sm text-neutral-500">No scheduled tasks.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-lg font-medium">{day}</h2>
              <ul className="space-y-1 text-sm">
                {list.map((t) => (
                  <li key={t.id} className="flex flex-wrap gap-x-2">
                    <span className="font-medium">{t.title}</span>
                    <span className="text-neutral-500">
                      {t.status} · {t.type} · {t.priority} ·{" "}
                      {new Date(t.deadline!).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
