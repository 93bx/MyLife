import { assertCareerTagsOnly, normalizeTagList } from "./taskTags";
import type { TaskPriority, TaskResources } from "./types";

export type CreateTaskFields = {
  title: string;
  priority: TaskPriority;
  resources: TaskResources;
  type: string;
  tags: string[];
  goalId: string | null;
  projectId: string | null;
  deadline: string | null;
  floating: boolean;
};

const PRIORITIES = new Set(["P1", "P2", "P3"]);
const RESOURCES = new Set(["time", "money", "both"]);

function asNullableString(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string") throw new Error("invalid id");
  return v;
}

export function parseCreateTaskBody(body: unknown): CreateTaskFields {
  if (body == null || typeof body !== "object") {
    throw new Error("invalid body");
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) throw new Error("title required");
  const type = typeof b.type === "string" ? b.type.trim() : "";
  if (!type) throw new Error("type required");
  if (typeof b.resources !== "string" || !RESOURCES.has(b.resources)) {
    throw new Error("invalid resources");
  }
  const priority =
    typeof b.priority === "string" && PRIORITIES.has(b.priority)
      ? b.priority
      : null;
  if (!priority) throw new Error("invalid priority");
  const tags = normalizeTagList(b.tags ?? []);
  assertCareerTagsOnly(tags);
  const floating = b.floating === undefined ? true : Boolean(b.floating);
  const deadline =
    b.deadline == null || b.deadline === ""
      ? null
      : typeof b.deadline === "string"
        ? b.deadline
        : (() => {
            throw new Error("invalid deadline");
          })();
  return {
    title,
    priority: priority as TaskPriority,
    resources: b.resources as TaskResources,
    type,
    tags,
    goalId: asNullableString(b.goalId),
    projectId: asNullableString(b.projectId),
    deadline,
    floating,
  };
}
