"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/apiClient";

type Endpoint = {
  id: string;
  kind: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string | null;
  trainsOnPrompts: boolean;
  enabled: boolean;
  sortOrder: number;
};

type EndpointForm = {
  kind: "provider" | "aggregator";
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  trainsOnPrompts: boolean;
  enabled: boolean;
  sortOrder: number;
};

const blankForm = (): EndpointForm => ({
  kind: "provider",
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  trainsOnPrompts: false,
  enabled: true,
  sortOrder: 0,
});

function maskKey(key: string) {
  if (key.length <= 4) return "••••";
  return `••••${key.slice(-4)}`;
}

function formFromEndpoint(ep: Endpoint): EndpointForm {
  return {
    kind: ep.kind === "aggregator" ? "aggregator" : "provider",
    name: ep.name,
    baseUrl: ep.baseUrl,
    apiKey: ep.apiKey,
    model: ep.model ?? "",
    trainsOnPrompts: ep.trainsOnPrompts,
    enabled: ep.enabled,
    sortOrder: ep.sortOrder,
  };
}

export default function SettingsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [form, setForm] = useState<EndpointForm>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [splitBank, setSplitBank] = useState(false);
  const [agentMuted, setAgentMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [epRes, setRes] = await Promise.all([
      apiJson<{ endpoints: Endpoint[] }>("/api/ai-endpoints"),
      apiJson<{ settings: { splitBank: boolean; agentMuted: boolean } }>(
        "/api/settings",
      ),
    ]);
    if (!epRes.ok) {
      setError(epRes.error);
      return;
    }
    if (!setRes.ok) {
      setError(setRes.error);
      return;
    }
    setError(null);
    setEndpoints(epRes.data.endpoints);
    setSplitBank(setRes.data.settings.splitBank);
    setAgentMuted(setRes.data.settings.agentMuted);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(patch: {
    splitBank?: boolean;
    agentMuted?: boolean;
  }) {
    const res = await apiJson("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!res.ok) setError(res.error);
  }

  function startEdit(ep: Endpoint) {
    setEditingId(ep.id);
    setForm(formFromEndpoint(ep));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(blankForm());
  }

  async function saveEndpoint() {
    setBusy(true);
    const payload = {
      ...form,
      model: form.model || null,
    };
    const res = editingId
      ? await apiJson("/api/ai-endpoints", {
          method: "PATCH",
          body: JSON.stringify({ id: editingId, ...payload }),
        })
      : await apiJson("/api/ai-endpoints", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditingId(null);
    setForm(blankForm());
    void load();
  }

  async function toggleEnabled(ep: Endpoint) {
    const res = await apiJson("/api/ai-endpoints", {
      method: "PATCH",
      body: JSON.stringify({ id: ep.id, enabled: !ep.enabled }),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void load();
  }

  async function removeEndpoint(id: string) {
    const res = await apiJson("/api/ai-endpoints", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (editingId === id) cancelEdit();
    void load();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-600">
          Free AI endpoint pool and machine flags. Seed starts empty — paste
          keys here.
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Flags</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splitBank}
            onChange={(e) => {
              setSplitBank(e.target.checked);
              void saveSettings({ splitBank: e.target.checked });
            }}
          />
          Split bank
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={agentMuted}
            onChange={(e) => {
              setAgentMuted(e.target.checked);
              void saveSettings({ agentMuted: e.target.checked });
            }}
          />
          Agent muted
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">AI endpoints</h2>
        <ul className="divide-y divide-neutral-200 border border-neutral-300">
          {endpoints.length === 0 ? (
            <li className="px-3 py-4 text-sm text-neutral-500">
              No endpoints yet. Add providers and aggregators below.
            </li>
          ) : (
            endpoints.map((ep) => (
              <li
                key={ep.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {ep.name}{" "}
                    <span className="font-normal text-neutral-500">
                      ({ep.kind})
                    </span>
                  </div>
                  <div className="text-neutral-500">
                    {ep.baseUrl} · model {ep.model ?? "—"} · key{" "}
                    {maskKey(ep.apiKey)} · sort {ep.sortOrder}
                    {ep.trainsOnPrompts ? " · trains" : ""}
                    {ep.enabled ? "" : " · disabled"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(ep)}
                    className="rounded border border-neutral-400 px-2 py-1 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleEnabled(ep)}
                    className="rounded border border-neutral-400 px-2 py-1 text-xs"
                  >
                    {ep.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeEndpoint(ep.id)}
                    className="rounded border border-red-400 px-2 py-1 text-xs text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {editingId ? "Edit endpoint" : "Add endpoint"}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Kind
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as "provider" | "aggregator",
                }))
              }
              className="rounded border border-neutral-400 bg-white px-3 py-2"
            >
              <option value="provider">provider</option>
              <option value="aggregator">aggregator</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded border border-neutral-400 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Base URL
            <input
              value={form.baseUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, baseUrl: e.target.value }))
              }
              className="rounded border border-neutral-400 bg-white px-3 py-2"
              placeholder="https://api.example.com/v1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            API key
            <input
              value={form.apiKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              className="rounded border border-neutral-400 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Model
            <input
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value }))
              }
              className="rounded border border-neutral-400 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sortOrder: Number(e.target.value),
                }))
              }
              className="rounded border border-neutral-400 bg-white px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.trainsOnPrompts}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  trainsOnPrompts: e.target.checked,
                }))
              }
            />
            Trains on prompts
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, enabled: e.target.checked }))
              }
            />
            Enabled
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveEndpoint()}
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy
              ? editingId
                ? "Saving…"
                : "Adding…"
              : editingId
                ? "Save changes"
                : "Add endpoint"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={busy}
              onClick={cancelEdit}
              className="rounded border border-neutral-400 px-3 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
