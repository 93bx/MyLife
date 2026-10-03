"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import {
  overloadWarning,
  partitionSmsFirst,
  workdayCapacityMinutes,
} from "@/domain/plan";
import { apiJson } from "@/lib/apiClient";
import { syncGoogleCalendarIfConnected } from "@/lib/google/clientSync";

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
  workStart: string;
  workEnd: string;
};

type PlanWeekRow = {
  id: string | null;
  weekStart: string;
  nightsOn: boolean;
  intentText: string;
  overloadWarned: boolean;
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
  const [workStart, setWorkStart] = useState("09:30");
  const [workEnd, setWorkEnd] = useState("17:30");
  const [intentText, setIntentText] = useState("");
  const [nightsOn, setNightsOn] = useState(true);
  const [language, setLanguage] = useState("");
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [weekMessage, setWeekMessage] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [weekBusy, setWeekBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCashPing, setShowCashPing] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);

    // Spawn recurrence instances before reading tasks so Money/Plan see due items.
    await apiJson<{ spawned: unknown[] }>("/api/recurrence/spawn", {
      method: "POST",
    });

    const [tasksRes, moneyRes, profileRes, cashPingRes, weekRes] =
      await Promise.all([
        apiJson<{ tasks: TaskRow[] }>("/api/tasks"),
        apiJson<{ balanceSar: number }>("/api/money"),
        apiJson<{ profile: ProfileRow }>("/api/profile"),
        apiJson<{ showBanner: boolean }>("/api/money/today-cash"),
        apiJson<{ planWeek: PlanWeekRow }>("/api/plan-weeks"),
      ]);

    if (tasksRes.ok) setTasks(tasksRes.data.tasks);
    else setLoadError(tasksRes.error);

    if (moneyRes.ok) setBalanceSar(moneyRes.data.balanceSar);
    else setLoadError((prev) => prev ?? moneyRes.error);

    if (profileRes.ok) {
      setBufferSar(profileRes.data.profile.cashBufferSar);
      setWorkStart(profileRes.data.profile.workStart ?? "09:30");
      setWorkEnd(profileRes.data.profile.workEnd ?? "17:30");
      if (!weekRes.ok) {
        setNightsOn(profileRes.data.profile.nightsDefaultOn);
      }
    } else {
      setLoadError((prev) => prev ?? profileRes.error);
    }

    if (weekRes.ok) {
      setIntentText(weekRes.data.planWeek.intentText ?? "");
      setNightsOn(weekRes.data.planWeek.nightsOn);
    } else {
      setLoadError((prev) => prev ?? weekRes.error);
    }

    if (cashPingRes.ok) setShowCashPing(cashPingRes.data.showBanner);
    else setShowCashPing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void syncGoogleCalendarIfConnected();
  }, []);

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

  const capacityMinutes = useMemo(
    () => workdayCapacityMinutes(workStart, workEnd),
    [workStart, workEnd],
  );

  const todayEstimateMinutes = useMemo(() => {
    const scheduled = open.filter((t) => !t.floating);
    return scheduled.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  }, [open]);

  const showOverload = overloadWarning(todayEstimateMinutes, capacityMinutes);

  async function skipCashPing() {
    setSkipBusy(true);
    const res = await apiJson<{ skipped: boolean }>("/api/money/today-cash", {
      method: "POST",
    });
    setSkipBusy(false);
    if (res.ok) setShowCashPing(false);
  }

  async function saveWeek() {
    setWeekBusy(true);
    setWeekMessage(null);
    const res = await apiJson<{ planWeek: PlanWeekRow }>("/api/plan-weeks", {
      method: "PATCH",
      body: JSON.stringify({ intentText, nightsOn }),
    });
    setWeekBusy(false);
    if (!res.ok) {
      setWeekMessage(res.error);
      return;
    }
    setIntentText(res.data.planWeek.intentText);
    setNightsOn(res.data.planWeek.nightsOn);
    setWeekMessage("Week intent saved.");
  }

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
      if (res.status === 403) {
        setPlanMessage(
          "Agent is muted in settings. Week intent can still be saved below.",
        );
      } else if (res.status === 404) {
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
      return <p className="text-sm text-text-muted">None</p>;
    }
    return (
      <ul className="space-y-1 text-sm">
        {ids.map(({ id }) => {
          const t = byId.get(id);
          if (!t) return null;
          return (
            <li key={id} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{t.title}</span>
              <span className="text-text-muted">
                {t.type} · {t.priority}
                {t.estimateMinutes != null ? (
                  <>
                    {" · "}
                    <span className="font-mono">{t.estimateMinutes}m</span>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  const fieldClass =
    "rounded border border-border bg-bg-elevated px-3 py-2 text-text outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent";

  return (
    <main className="space-y-6">
      <HubHeader
        title="Plan"
        description="Week intent, today (SMS then extra), floating pool."
        action={
          <div className="rounded border border-border bg-bg-elevated px-4 py-3 text-sm">
            <div>
              Cash balance:{" "}
              <strong className="font-mono">
                {balanceSar === null ? "…" : formatSar(balanceSar)}
              </strong>
            </div>
            <div>
              Buffer:{" "}
              <strong className="font-mono">{formatSar(bufferSar)}</strong>
            </div>
          </div>
        }
      />

      {showOverload ? (
        <div
          role="status"
          className="rounded border border-warning bg-bg-elevated px-4 py-3 text-sm text-warning"
        >
          Today’s estimates (
          <span className="font-mono">{todayEstimateMinutes}</span> min) exceed
          workday capacity (
          <span className="font-mono">{capacityMinutes}</span> min from{" "}
          <span className="font-mono">
            {workStart}–{workEnd}
          </span>
          ). No hard cap — you can ignore this.
        </div>
      ) : null}

      {showCashPing ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded border border-warning bg-bg-elevated px-4 py-3 text-sm text-warning"
        >
          <span>No cash logged today</span>
          <button
            type="button"
            disabled={skipBusy}
            onClick={() => void skipCashPing()}
            className="rounded border border-warning px-3 py-1 text-warning hover:bg-bg disabled:opacity-50"
          >
            {skipBusy ? "Skipping…" : "Skip"}
          </button>
        </div>
      ) : null}

      {loadError ? (
        <p className="text-sm text-danger">Load error: {loadError}</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Week</h2>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Intent
          <textarea
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
            rows={3}
            className={fieldClass}
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
        <button
          type="button"
          disabled={weekBusy}
          onClick={() => void saveWeek()}
          className="rounded border border-border bg-bg-elevated px-3 py-2 text-sm hover:border-accent disabled:opacity-50"
        >
          {weekBusy ? "Saving…" : "Save week"}
        </button>
        {weekMessage ? (
          <p className="text-sm text-text-muted">{weekMessage}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Language box</h2>
        <textarea
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          rows={3}
          className={`w-full text-sm ${fieldClass}`}
          placeholder="Describe week or day changes in plain language…"
        />
        <button
          type="button"
          disabled={planBusy || !language.trim()}
          onClick={() => void runLanguagePlan()}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-bg hover:bg-accent-muted hover:text-text disabled:opacity-50"
        >
          {planBusy ? "Sending…" : "Apply language"}
        </button>
        {planMessage ? (
          <p className="text-sm text-text-muted">{planMessage}</p>
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
            <p className="text-sm text-text-muted">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {floatingPool.map((t) => (
                <li key={t.id} className="flex flex-wrap gap-x-2">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-text-muted">
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
