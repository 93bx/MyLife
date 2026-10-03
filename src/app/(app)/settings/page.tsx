"use client";

import { useCallback, useEffect, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
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

type GoogleCalendarRow = {
  id: string;
  calendarId: string;
  summary: string;
  isPrimary: boolean;
  selected: boolean;
};

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  pushUnavailable: boolean;
  calendars: GoogleCalendarRow[];
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

const fieldClass =
  "rounded border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent";

const primaryBtnClass =
  "rounded bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent-muted hover:text-text disabled:opacity-50";

const secondaryBtnClass =
  "rounded border border-border px-3 py-2 text-sm hover:bg-bg-elevated disabled:opacity-50";

const ghostBtnClass =
  "rounded border border-border px-2 py-1 text-xs hover:bg-bg-elevated";

export default function SettingsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [form, setForm] = useState<EndpointForm>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [splitBank, setSplitBank] = useState(false);
  const [agentMuted, setAgentMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState<GoogleStatus>({
    connected: false,
    email: null,
    pushUnavailable: true,
    calendars: [],
  });
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const loadGoogle = useCallback(async () => {
    const res = await apiJson<GoogleStatus>("/api/google/calendars");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setGoogle(res.data);
  }, []);

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
    void loadGoogle();
  }, [loadGoogle]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (!googleParam) {
      return;
    }
    if (googleParam === "connected") {
      setGoogleNotice("Google Calendar connected.");
    } else if (googleParam === "error") {
      const reason = params.get("reason");
      const message =
        reason === "state"
          ? "Google sign-in failed (invalid state). Try again."
          : reason === "no_refresh_token"
            ? "Google did not return a refresh token. Disconnect the app in your Google account and reconnect."
            : reason === "config"
              ? "Google OAuth is not configured on this server."
              : "Google sign-in failed. Try again.";
      setError(message);
    }
    window.history.replaceState({}, "", "/settings");
    void loadGoogle();
  }, [loadGoogle]);

  async function disconnectGoogle() {
    setGoogleBusy(true);
    const res = await apiJson<{ disconnected: boolean }>(
      "/api/google/calendar/disconnect",
      { method: "POST" },
    );
    setGoogleBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setGoogleNotice("Google Calendar disconnected.");
    setGoogle({
      connected: false,
      email: null,
      pushUnavailable: true,
      calendars: [],
    });
    void loadGoogle();
  }

  async function toggleGoogleCalendar(cal: GoogleCalendarRow) {
    if (cal.isPrimary) {
      return;
    }
    setGoogleBusy(true);
    const res = await apiJson<{ calendars: GoogleCalendarRow[] }>(
      "/api/google/calendars",
      {
        method: "PATCH",
        body: JSON.stringify({
          calendarId: cal.calendarId,
          selected: !cal.selected,
        }),
      },
    );
    setGoogleBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setGoogle((g) => ({ ...g, calendars: res.data.calendars }));
  }

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
    <main className="space-y-6">
      <HubHeader
        title="Settings"
        description="Free AI endpoint pool and machine flags. Seed starts empty — paste keys here."
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {googleNotice ? (
        <p className="text-sm text-accent">{googleNotice}</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Google Calendar</h2>
        <p className="text-sm text-text-muted">
          Connect your personal Google account to mirror events and sync
          MyLife planning blocks.
        </p>
        {google.connected && google.pushUnavailable ? (
          <p className="text-sm text-text-muted">
            Push unavailable — pull on page load.
          </p>
        ) : null}
        {google.connected ? (
          <div className="space-y-3">
            <p className="text-sm">
              Connected as{" "}
              <span className="font-medium">{google.email ?? "—"}</span>
            </p>
            <ul className="divide-y divide-border border border-border">
              {google.calendars.length === 0 ? (
                <li className="px-3 py-4 text-sm text-text-muted">
                  No calendars listed yet.
                </li>
              ) : (
                google.calendars.map((cal) => (
                  <li key={cal.id} className="px-3 py-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={cal.selected}
                        disabled={googleBusy || cal.isPrimary}
                        onChange={() => void toggleGoogleCalendar(cal)}
                      />
                      <span>
                        {cal.summary}
                        {cal.isPrimary ? (
                          <span className="text-text-muted"> (primary)</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              disabled={googleBusy}
              onClick={() => void disconnectGoogle()}
              className="rounded border border-danger px-3 py-2 text-sm text-danger disabled:opacity-50"
            >
              Disconnect Google
            </button>
          </div>
        ) : (
          <a href="/api/google/oauth/start" className={`inline-block ${primaryBtnClass}`}>
            Connect Google
          </a>
        )}
      </section>

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
        <ul className="divide-y divide-border border border-border">
          {endpoints.length === 0 ? (
            <li className="px-3 py-4 text-sm text-text-muted">
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
                    <span className="font-normal text-text-muted">
                      ({ep.kind})
                    </span>
                  </div>
                  <div className="text-text-muted">
                    {ep.baseUrl} · model {ep.model ?? "—"} · key{" "}
                    <span className="font-mono">{maskKey(ep.apiKey)}</span> ·
                    sort <span className="font-mono">{ep.sortOrder}</span>
                    {ep.trainsOnPrompts ? " · trains" : ""}
                    {ep.enabled ? "" : " · disabled"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(ep)}
                    className={ghostBtnClass}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleEnabled(ep)}
                    className={ghostBtnClass}
                  >
                    {ep.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeEndpoint(ep.id)}
                    className="rounded border border-danger px-2 py-1 text-xs text-danger"
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
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Kind
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as "provider" | "aggregator",
                }))
              }
              className={fieldClass}
            >
              <option value="provider">provider</option>
              <option value="aggregator">aggregator</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Base URL
            <input
              value={form.baseUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, baseUrl: e.target.value }))
              }
              className={`${fieldClass} font-mono`}
              placeholder="https://api.example.com/v1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            API key
            <input
              value={form.apiKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              className={`${fieldClass} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
            Model
            <input
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value }))
              }
              className={`${fieldClass} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text-muted">
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
              className={`${fieldClass} font-mono`}
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
            className={primaryBtnClass}
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
              className={secondaryBtnClass}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
