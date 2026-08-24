"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { partitionSmsFirst } from "@/domain/plan";
import { apiJson } from "@/lib/apiClient";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  resources: string;
  estimateMinutes: number | null;
  plannedSar: string | null;
  floating: boolean;
  deadline: string | null;
};

type ProfileRow = {
  cashBufferSar: string | null;
  nightsDefaultOn: boolean;
};

function formatSar(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })} SAR`;
}

export default function PlanPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [balanceSar, setBalanceSar] = useState<number | null>(null);
  const [bufferSar, setBufferSar] = useState<string | null>(null);
  const [intentText, setIntentText] = useState("");
  const [nightsOn, setNightsOn] = useState(true);
  const [language, setLanguage] = useState("");
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const [tasksRes, moneyRes, profileRes] = await Promise.all([
      apiJson<{ tasks: TaskRow[] }>("/api/tasks"),
      apiJson<{ balanceSar: number }>("/api/money"),
      apiJson<{ profile: ProfileRow }>("/api/profile"),
    ]);

    if (tasksRes.ok) setTasks(tasksRes.data.tasks);
    else setLoadError(tasksRes.error);

    if (moneyRes.ok) setBalanceSar(moneyRes.data.balanceSar);
    else setLoadError((prev) => prev ?? moneyRes.error);

    if (profileRes.ok) {
      setBufferSar(profileRes.data.profile.cashBufferSar);
      setNightsOn(profileRes.data.profile.nightsDefaultOn);
    } else {
      setLoadError((prev) => prev ?? profileRes.error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = useMemo(
    () => tasks.filter((t) => t.status === "open"),
    [tasks],
  );

  const todayList = useMemo(() => {
    const scheduled = open.filter((t) => !t.floating);
    return partitionSmsFirst(
      scheduled.map((t) => ({
        id: t.id,
        type: t.type,
        estimateMinutes: t.estimateMinutes ?? 0,
        floating: t.floating,
      })),
    );
  }, [open]);

  const byId = useMemo(() => {
    const map = new Map(open.map((t) => [t.id, t]));
    return map;
  }, [open]);

  const floatingPool = useMemo(
    () => open.filter((t) => t.floating),
    [open],
  );

  async function runLanguagePlan() {
    setPlanBusy(true);
    setPlanMessage(null);
    const res = await apiJson<{ applied?: boolean; warning?: string }>(
      "/api/agent/plan",
      {
        method: "POST",
        body: JSON.stringify({
          text: language,
          scope: "auto",
          intentText,
          nightsOn,
        }),
      },
    );
    setPlanBusy(false);

    if (!res.ok) {
      if (res.status === 404) {
        setPlanMessage(
          "Plan agent is not available yet (404). Tasks and balance still work.",
        );
      } else if (res.status === 503) {
        setPlanMessage(
          "Free AI exhausted (503). Tasks and balance still work — try again later.",
        );
      } else {
        setPlanMessage(res.error);
      }
      return;
    }

    setPlanMessage(
      res.data.warning ??
        (res.data.applied === false
          ? "Plan saved without applying task changes."
          : "Plan request accepted."),
    );
    void load();
  }

  function renderTaskIds(ids: { id: string }[]) {
    if (ids.length === 0) {
      return <p className="text-sm text-neutral-500">None</p>;
    }
    return (
      <ul className="space-y-1 text-sm">
        {ids.map(({ id }) => {
          const t = byId.get(id);
          if (!t) return null;
          return (
            <li key={id} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{t.title}</span>
              <span className="text-neutral-500">
                {t.type} · {t.priority}
                {t.estimateMinutes != null ? ` · ${t.estimateMinutes}m` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
          <p className="text-sm text-neutral-600">
            Week intent, today (SMS then extra), floating pool.
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm">
          <div>
            Cash balance:{" "}
            <strong>
              {balanceSar === null ? "…" : formatSar(balanceSar)}
            </strong>
          </div>
          <div>
            Buffer: <strong>{formatSar(bufferSar)}</strong>
          </div>
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-red-700">Load error: {loadError}</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Week</h2>
        <label className="flex flex-col gap-1 text-sm">
          Intent
          <textarea
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            rows={3}
            className="rounded border border-neutral-400 bg-white px-3 py-2"
            placeholder="What should this week optimize for?"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nightsOn}
            onChange={(e) => setNightsOn(e.target.checked)}
          />
          Nights on
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Language box</h2>
        <textarea
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          rows={3}
          className="w-full rounded border border-neutral-400 bg-white px-3 py-2 text-sm"
          placeholder="Describe week or day changes in plain language…"
        />
        <button
          type="button"
          disabled={planBusy || !language.trim()}
          onClick={() => void runLanguagePlan()}
          className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {planBusy ? "Sending…" : "Apply language"}
        </button>
        {planMessage ? (
          <p className="text-sm text-neutral-700">{planMessage}</p>
        ) : null}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Today — SMS first</h2>
          {renderTaskIds(todayList.sms)}
          <h3 className="text-base font-medium">Extra</h3>
          {renderTaskIds(todayList.extra)}
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Floating pool</h2>
          {floatingPool.length === 0 ? (
            <p className="text-sm text-neutral-500">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {floatingPool.map((t) => (
                <li key={t.id} className="flex flex-wrap gap-x-2">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-neutral-500">
                    {t.type} · {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
