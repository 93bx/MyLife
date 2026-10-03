"use client";

import { useCallback, useEffect, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { apiJson } from "@/lib/apiClient";

type TemplateRow = {
  id: string;
  title: string;
  rruleOrKind: string;
  resources: string;
  type: string;
  plannedSar: string | null;
  enabled: boolean;
  latestInstance: { dueFor: string; status: string } | null;
};

export default function TasksRecurrencePage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiJson<{ templates: TemplateRow[] }>("/api/recurrence");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setTemplates(res.data.templates);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setEnabled(id: string, enabled: boolean) {
    setBusyId(id);
    const res = await apiJson(`/api/recurrence/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
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
        title="Recurrence"
        description="Templates and latest spawned instances. Spawn runs from Dashboard/Plan."
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border border border-border">
        {templates.length === 0 ? (
          <li className="px-3 py-4 text-sm text-text-muted">
            No recurrence templates.
          </li>
        ) : (
          templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-text-muted">
                  {t.rruleOrKind} · {t.resources} · {t.type}
                  {t.plannedSar != null ? ` · planned ${t.plannedSar} SAR` : ""}
                </div>
                <div className="text-text-muted">
                  {t.latestInstance
                    ? `Latest: ${t.latestInstance.dueFor} · ${t.latestInstance.status}`
                    : "no instance yet"}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  disabled={busyId === t.id}
                  onChange={(e) => void setEnabled(t.id, e.target.checked)}
                />
                Enabled
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
