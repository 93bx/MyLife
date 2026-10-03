"use client";

import { useCallback, useEffect, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { CAREER_TAGS } from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";

const TYPE_PRESETS = [
  "study",
  "pay",
  "apply",
  "sms",
  "brand",
  "log_cash",
  "confirm_income",
  "oss",
  "hustle",
  "other",
] as const;

type GoalRow = { id: string; title: string };
type ProjectRow = { id: string; title: string };

const emptyForm = {
  title: "",
  priority: "P2",
  resources: "time",
  typePreset: "study",
  typeCustom: "",
  tags: [] as string[],
  goalId: "",
  projectId: "",
  deadline: "",
  floating: true,
};

const fieldClass = "border border-border bg-bg px-2 py-1";

export default function TasksCapturePage() {
  const [form, setForm] = useState(emptyForm);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadLists = useCallback(async () => {
    const [g, p] = await Promise.all([
      apiJson<{ goals: GoalRow[] }>("/api/goals"),
      apiJson<{ projects: ProjectRow[] }>("/api/projects"),
    ]);
    if (g.ok) setGoals(g.data.goals);
    if (p.ok) setProjects(p.data.projects);
    if (!g.ok) setError(g.error);
    else if (!p.ok) setError(p.error);
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const type =
      form.typePreset === "other" ? form.typeCustom.trim() : form.typePreset;
    const res = await apiJson<{ task: { id: string } }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        priority: form.priority,
        resources: form.resources,
        type,
        tags: form.tags,
        goalId: form.goalId || null,
        projectId: form.projectId || null,
        deadline: form.deadline || null,
        floating: form.floating,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm(emptyForm);
    setOk("Created.");
  }

  return (
    <div className="space-y-6">
      <HubHeader
        title="Capture"
        description="Create an open task. Goal/Project set ownership; career chips set hub facets."
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {ok ? <p className="text-sm text-text-muted">{ok}</p> : null}
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex max-w-xl flex-col gap-3 text-sm"
      >
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Priority</span>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className={fieldClass}
          >
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Resources</span>
          <select
            value={form.resources}
            onChange={(e) => setForm({ ...form, resources: e.target.value })}
            className={fieldClass}
          >
            <option value="time">time</option>
            <option value="money">money</option>
            <option value="both">both</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Type</span>
          <select
            value={form.typePreset}
            onChange={(e) => setForm({ ...form, typePreset: e.target.value })}
            className={fieldClass}
          >
            {TYPE_PRESETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {form.typePreset === "other" ? (
          <label className="flex flex-col gap-1">
            <span className="text-text-muted">Custom type</span>
            <input
              required
              value={form.typeCustom}
              onChange={(e) =>
                setForm({ ...form, typeCustom: e.target.value })
              }
              className={fieldClass}
            />
          </label>
        ) : null}
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-text-muted">Career tags</legend>
          {CAREER_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.tags.includes(tag)}
                onChange={() => toggleTag(tag)}
              />
              {tag}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Goal (optional)</span>
          <select
            value={form.goalId}
            onChange={(e) => setForm({ ...form, goalId: e.target.value })}
            className={fieldClass}
          >
            <option value="">—</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Project (optional)</span>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            className={fieldClass}
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">Deadline (optional)</span>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.floating}
            onChange={(e) =>
              setForm({ ...form, floating: e.target.checked })
            }
          />
          <span>Floating (anytime before deadline)</span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-border px-3 py-1.5 hover:bg-bg-elevated disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create task"}
        </button>
      </form>
    </div>
  );
}
