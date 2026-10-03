"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarStrip, type StripBlock } from "@/components/dashboard/CalendarStrip";
import { CashBuffer } from "@/components/dashboard/CashBuffer";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { P1Strip } from "@/components/dashboard/P1Strip";
import { TodayFocus } from "@/components/dashboard/TodayFocus";
import { HubHeader } from "@/components/HubHeader";
import { buildAttentionItems } from "@/domain/dashboardAttention";
import {
  DEFAULT_TASK_TZ,
  isOpenTask,
  isOverdueTask,
} from "@/domain/hubFilters";
import { apiJson } from "@/lib/apiClient";
import { syncGoogleCalendarIfConnected } from "@/lib/google/clientSync";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  resources: string;
  deadline: string | null;
  tags: string;
  goalId: string | null;
  projectId: string | null;
};

type ProfileRow = {
  cashBufferSar: string | null;
  timezone?: string;
};

type CalendarBlock = StripBlock;

function parseTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}

function localDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nextThreeDaysWindow(now: Date = new Date()): { start: Date; end: Date } {
  const start = localDayStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return { start, end };
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [balanceSar, setBalanceSar] = useState<number | null>(null);
  const [bufferSar, setBufferSar] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(DEFAULT_TASK_TZ);
  const [showCashPing, setShowCashPing] = useState(false);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);

    await apiJson<{ spawned: unknown[] }>("/api/recurrence/spawn", {
      method: "POST",
    });

    const { start, end } = nextThreeDaysWindow();
    const qs = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const [tasksRes, moneyRes, profileRes, cashPingRes, blocksRes] =
      await Promise.all([
        apiJson<{ tasks: TaskRow[] }>("/api/tasks"),
        apiJson<{ balanceSar: number }>("/api/money"),
        apiJson<{ profile: ProfileRow }>("/api/profile"),
        apiJson<{ showBanner: boolean }>("/api/money/today-cash"),
        apiJson<{ blocks: CalendarBlock[] }>(`/api/calendar-blocks?${qs}`),
      ]);

    if (tasksRes.ok) setTasks(tasksRes.data.tasks);
    else setLoadError(tasksRes.error);

    if (moneyRes.ok) setBalanceSar(moneyRes.data.balanceSar);
    else setLoadError((prev) => prev ?? moneyRes.error);

    if (profileRes.ok) {
      setBufferSar(profileRes.data.profile.cashBufferSar);
      setTimezone(profileRes.data.profile.timezone ?? DEFAULT_TASK_TZ);
    } else setLoadError((prev) => prev ?? profileRes.error);

    if (cashPingRes.ok) setShowCashPing(cashPingRes.data.showBanner);
    else setShowCashPing(false);

    if (blocksRes.ok) setBlocks(blocksRes.data.blocks);
    else setLoadError((prev) => prev ?? blocksRes.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void syncGoogleCalendarIfConnected();
  }, []);

  const openTasks = useMemo(
    () =>
      tasks.filter((t) =>
        isOpenTask({
          status: t.status,
          resources: t.resources,
          deadline: t.deadline,
          tags: parseTags(t.tags),
          goalId: t.goalId,
          projectId: t.projectId,
        }),
      ),
    [tasks],
  );

  const p1Tasks = useMemo(
    () => openTasks.filter((t) => t.priority === "P1"),
    [openTasks],
  );

  const attentionItems = useMemo(() => {
    const now = new Date();
    const overdueTasks = tasks
      .filter((t) =>
        isOverdueTask(
          {
            status: t.status,
            resources: t.resources,
            deadline: t.deadline,
            tags: parseTags(t.tags),
            goalId: t.goalId,
            projectId: t.projectId,
          },
          now,
          timezone,
        ),
      )
      .map((t) => ({ id: t.id, title: t.title }));
    return buildAttentionItems({ overdueTasks, showCashPing });
  }, [tasks, showCashPing, timezone]);

  return (
    <div className="space-y-6">
      <HubHeader
        title="Dashboard"
        description="Today’s focus, calendar, cash, P1s, and attention."
      />

      {loadError ? (
        <p className="text-sm text-danger">Load error: {loadError}</p>
      ) : null}

      <TodayFocus
        tasks={openTasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
        }))}
      />
      <CalendarStrip blocks={blocks} />
      <CashBuffer balanceSar={balanceSar} cashBufferSar={bufferSar} />
      <P1Strip
        tasks={p1Tasks.map((t) => ({ id: t.id, title: t.title }))}
      />
      <NeedsAttention items={attentionItems} />
    </div>
  );
}
