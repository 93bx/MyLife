"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiJson } from "@/lib/apiClient";
import { syncGoogleCalendarIfConnected } from "@/lib/google/clientSync";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  floating: boolean;
  deadline: string | null;
};

type CalendarBlock = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  ownedByApp: boolean;
  mirrored: boolean;
  dirty: boolean;
  editable: boolean;
};

type ViewMode = "day" | "week";

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date) {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function addUtcDays(d: Date, days: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string) {
  return new Date(value).toISOString();
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${start.toLocaleString()} – ${end.toLocaleTimeString()}`;
}

const fieldClass =
  "rounded border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-accent";

export default function CalendarPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("week");
  const [anchorDay, setAnchorDay] = useState(() =>
    startOfUtcDay(new Date()).toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const windowRange = useMemo(() => {
    const start = new Date(`${anchorDay}T00:00:00.000Z`);
    if (view === "day") {
      return { start, end: addUtcDays(start, 1) };
    }
    return { start, end: addUtcDays(start, 7) };
  }, [anchorDay, view]);

  const loadTasks = useCallback(async () => {
    const res = await apiJson<{ tasks: TaskRow[] }>("/api/tasks");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTasks(res.data.tasks);
  }, []);

  const loadBlocks = useCallback(async () => {
    const qs = new URLSearchParams({
      start: windowRange.start.toISOString(),
      end: windowRange.end.toISOString(),
    });
    const res = await apiJson<{ blocks: CalendarBlock[] }>(
      `/api/calendar-blocks?${qs}`,
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBlocks(res.data.blocks);
  }, [windowRange.end, windowRange.start]);

  const load = useCallback(async () => {
    setError(null);
    await Promise.all([loadTasks(), loadBlocks()]);
  }, [loadBlocks, loadTasks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncGoogleCalendarIfConnected();
      if (!cancelled) {
        await load();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, CalendarBlock[]>();
    for (const block of blocks) {
      const key = dayKey(block.startAt);
      const list = map.get(key) ?? [];
      list.push(block);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [blocks]);

  const groupedTasks = useMemo(() => {
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

  function beginEdit(block: CalendarBlock) {
    setEditingId(block.id);
    setEditTitle(block.title);
    setEditStart(toDatetimeLocalValue(block.startAt));
    setEditEnd(toDatetimeLocalValue(block.endAt));
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(true);
    const res = await apiJson<{ block: CalendarBlock }>("/api/calendar-blocks", {
      method: "PATCH",
      body: JSON.stringify({
        id: editingId,
        title: editTitle,
        startAt: fromDatetimeLocalValue(editStart),
        endAt: fromDatetimeLocalValue(editEnd),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditingId(null);
    await loadBlocks();
    void syncGoogleCalendarIfConnected();
  }

  async function removeBlock(id: string) {
    setBusy(true);
    const res = await apiJson("/api/calendar-blocks", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (editingId === id) setEditingId(null);
    await loadBlocks();
    void syncGoogleCalendarIfConnected();
  }

  async function createBlock(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newStart || !newEnd) {
      setError("Title, start, and end are required");
      return;
    }
    setBusy(true);
    const res = await apiJson<{ block: CalendarBlock }>("/api/calendar-blocks", {
      method: "POST",
      body: JSON.stringify({
        title: newTitle.trim(),
        startAt: fromDatetimeLocalValue(newStart),
        endAt: fromDatetimeLocalValue(newEnd),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
    await loadBlocks();
    void syncGoogleCalendarIfConnected();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-text-muted">
          Merged Google events and MyLife blocks. Overlaps show both.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Anchor day
            <input
              type="date"
              value={anchorDay}
              onChange={(e) => setAnchorDay(e.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("day")}
              className={`rounded border px-3 py-2 text-sm ${
                view === "day"
                  ? "border-accent text-accent"
                  : "border-border hover:bg-bg-elevated"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded border px-3 py-2 text-sm ${
                view === "week"
                  ? "border-accent text-accent"
                  : "border-border hover:bg-bg-elevated"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {blocksByDay.length === 0 ? (
          <p className="text-sm text-text-muted">
            No calendar blocks in this {view}.
          </p>
        ) : (
          <div className="space-y-6">
            {blocksByDay.map(([day, list]) => (
              <section key={day} className="space-y-2">
                <h2 className="font-mono text-lg font-medium">{day}</h2>
                <ul className="divide-y divide-border border border-border">
                  {list.map((block) => (
                    <li
                      key={block.id}
                      className={`space-y-2 px-3 py-3 text-sm ${
                        block.editable
                          ? ""
                          : "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {editingId === block.id ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                          <label className="flex flex-col gap-1 text-text-muted">
                            Title
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-text-muted">
                            Start
                            <input
                              type="datetime-local"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-text-muted">
                            End
                            <input
                              type="datetime-local"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className={fieldClass}
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void saveEdit()}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditingId(null)}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  block.editable
                                    ? "font-medium"
                                    : "font-medium italic"
                                }
                              >
                                {block.title}
                              </span>
                              <span className="font-mono text-xs text-text-muted">
                                {block.editable ? "MyLife" : "Google (read-only)"}
                              </span>
                              {block.dirty && block.editable ? (
                                <span className="font-mono text-xs text-warning">
                                  pending sync
                                </span>
                              ) : null}
                            </div>
                            <div className="font-mono text-text-muted">
                              {formatRange(block.startAt, block.endAt)}
                            </div>
                          </div>
                          {block.editable ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => beginEdit(block)}
                                className="rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void removeBlock(block.id)}
                                className="rounded border border-border px-2 py-1 text-xs text-danger hover:bg-bg-elevated disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => void createBlock(e)}
          className="space-y-3 border border-border bg-bg-elevated p-3"
        >
          <h3 className="text-sm font-medium">Add MyLife block</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Title
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={fieldClass}
                placeholder="Focus block"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Start
              <input
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-muted">
              End
              <input
                type="datetime-local"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className={fieldClass}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded border border-border px-3 py-2 text-sm hover:bg-bg disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Scheduled tasks
          </h2>
          <p className="text-sm text-text-muted">
            Non-floating tasks by deadline.
          </p>
        </div>
        {groupedTasks.length === 0 ? (
          <p className="text-sm text-text-muted">No scheduled tasks.</p>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map(([day, list]) => (
              <section key={day} className="space-y-2">
                <h3 className="font-mono text-base font-medium">{day}</h3>
                <ul className="space-y-1 text-sm">
                  {list.map((t) => (
                    <li key={t.id} className="flex flex-wrap gap-x-2">
                      <span className="font-medium">{t.title}</span>
                      <span className="text-text-muted">
                        {t.status} · {t.type} · {t.priority} ·{" "}
                        <span className="font-mono">
                          {new Date(t.deadline!).toLocaleTimeString()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
