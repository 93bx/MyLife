"use client";

import { useState } from "react";
import { apiJson } from "@/lib/apiClient";

type LogEntry = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  usedEndpointName?: string;
};

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text) return;

    const userEntry: LogEntry = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const nextLog = [...log, userEntry];
    setLog(nextLog);
    setInput("");
    setBusy(true);
    setError(null);

    const messages = nextLog
      .filter((e) => e.role === "user" || e.role === "assistant")
      .map((e) => ({ role: e.role as "user" | "assistant", content: e.content }));

    const res = await apiJson<{ content: string; usedEndpointName: string }>(
      "/api/agent/chat",
      {
        method: "POST",
        body: JSON.stringify({ messages }),
      },
    );
    setBusy(false);

    if (!res.ok) {
      setError(
        res.status === 403
          ? "Agent is muted in settings (403)."
          : res.status === 503
            ? "All free AI endpoints failed (503)."
            : res.error,
      );
      return;
    }

    setLog((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.data.content,
        usedEndpointName: res.data.usedEndpointName,
      },
    ]);
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent</h1>
        <p className="text-sm text-text-muted">
          Free-tier chat via server-side chatFree. API keys stay on the server.
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="space-y-3 border border-border bg-bg-elevated p-3">
        {log.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet.</p>
        ) : (
          log.map((entry) => (
            <div key={entry.id} className="text-sm">
              <div className="font-medium capitalize">{entry.role}</div>
              <p className="whitespace-pre-wrap">{entry.content}</p>
              {entry.usedEndpointName ? (
                <p className="font-mono text-xs text-text-muted">
                  usedEndpointName: {entry.usedEndpointName}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Message
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="rounded border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-accent"
          placeholder="Ask the agent…"
        />
      </label>
      <button
        type="button"
        disabled={busy || !input.trim()}
        onClick={() => void send()}
        className="rounded bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent-muted hover:text-text disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </main>
  );
}
