import type { TaskPriority, TaskResources } from "@/domain/types";
import type { ChatMessage } from "./types";

export type PlanAgentTask = {
  id?: string;
  title: string;
  type: string;
  priority: TaskPriority;
  resources: TaskResources;
  floating: boolean;
  projectHint?: string;
};

export type PlanAgentResult = {
  nightsOn?: boolean;
  warning?: string;
  tasks?: PlanAgentTask[];
};

export type PlanScope = "week" | "day" | "auto";

export type PlanSlice = {
  scope: "week" | "day";
  openTasks: Array<{
    id: string;
    title: string;
    type: string;
    priority: string;
    resources: string;
    estimateMinutes: number | null;
  }>;
  weekFlags: { nightsOn: boolean; intentText: string };
  cashBalanceSar: number;
};

const PRIORITIES = new Set<TaskPriority>(["P1", "P2", "P3"]);
const RESOURCES = new Set<TaskResources>(["time", "money", "both"]);

function isPriority(v: unknown): v is TaskPriority {
  return typeof v === "string" && PRIORITIES.has(v as TaskPriority);
}

function isResources(v: unknown): v is TaskResources {
  return typeof v === "string" && RESOURCES.has(v as TaskResources);
}

function extractJsonText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return null;
}

function parseTask(value: unknown): PlanAgentTask | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;

  if (typeof o.title !== "string" || !o.title.trim()) return null;
  if (typeof o.type !== "string" || !o.type.trim()) return null;
  if (!isPriority(o.priority)) return null;
  if (!isResources(o.resources)) return null;
  if (typeof o.floating !== "boolean") return null;
  if (o.id !== undefined && typeof o.id !== "string") return null;
  if (o.projectHint !== undefined && typeof o.projectHint !== "string") {
    return null;
  }

  const task: PlanAgentTask = {
    title: o.title,
    type: o.type,
    priority: o.priority,
    resources: o.resources,
    floating: o.floating,
  };
  if (typeof o.id === "string") task.id = o.id;
  if (typeof o.projectHint === "string") task.projectHint = o.projectHint;
  return task;
}

/** Parse model output into PlanAgentResult; null if invalid JSON or schema. */
export function parsePlanAgentJson(raw: string): PlanAgentResult | null {
  const jsonText = extractJsonText(raw);
  if (!jsonText) return null;

  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;

  if (o.nightsOn !== undefined && typeof o.nightsOn !== "boolean") return null;
  if (o.warning !== undefined && typeof o.warning !== "string") return null;
  if (o.tasks !== undefined && !Array.isArray(o.tasks)) return null;

  const result: PlanAgentResult = {};
  if (typeof o.nightsOn === "boolean") result.nightsOn = o.nightsOn;
  if (typeof o.warning === "string") result.warning = o.warning;

  if (Array.isArray(o.tasks)) {
    const tasks: PlanAgentTask[] = [];
    for (const item of o.tasks) {
      const task = parseTask(item);
      if (!task) return null;
      tasks.push(task);
    }
    result.tasks = tasks;
  }

  return result;
}

/** If scope is auto, week when text mentions week/nights; else day. */
export function resolvePlanScope(
  scope: PlanScope,
  text: string,
): "week" | "day" {
  if (scope === "week" || scope === "day") return scope;
  const lower = text.toLowerCase();
  if (/\bweek\b/.test(lower) || /\bnights?\b/.test(lower)) return "week";
  return "day";
}

/**
 * Friday YYYY-MM-DD in Asia/Riyadh for the current fri-sat weekend week.
 * Walks back from today's Riyadh calendar date to the most recent Friday.
 */
export function riyadhWeekStartFriday(asOf: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    weekday: "short",
  });

  // Noon UTC keeps the Riyadh calendar day stable while we step back.
  let cursor = new Date(asOf);
  for (let i = 0; i < 7; i++) {
    const ymd = fmt.format(cursor);
    const weekday = weekdayFmt.format(cursor);
    if (weekday === "Fri") return ymd;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return fmt.format(asOf);
}

export function buildPlanAgentMessages(
  slice: PlanSlice,
  userText: string,
): ChatMessage[] {
  const system = [
    "You are the MyLife plan agent. Reply with ONLY a JSON object matching:",
    '{"nightsOn"?: boolean, "warning"?: string, "tasks"?: [{ "id"?: string, "title": string, "type": string, "priority": "P1"|"P2"|"P3", "resources": "time"|"money"|"both", "floating": boolean, "projectHint"?: string }]}',
    "Use existing task ids to update/reorder; omit id to create. Never invent transactions or cash movements. Never spend money.",
    `Scope: ${slice.scope}.`,
    `Week flags: ${JSON.stringify(slice.weekFlags)}.`,
    `Cash balance SAR (no transaction history): ${slice.cashBalanceSar}.`,
    `Open tasks slice: ${JSON.stringify(slice.openTasks)}.`,
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: userText },
  ];
}
