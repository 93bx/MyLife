import { CAREER_TAGS } from "./hubFilters";

export function normalizeTagList(raw: unknown): string[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  } else {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const tag = item.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(normalizeTagList(tags));
}

export function assertCareerTagsOnly(tags: string[]): void {
  const allowed = new Set<string>(CAREER_TAGS);
  for (const tag of tags) {
    if (!allowed.has(tag)) {
      throw new Error(`invalid tag: ${tag}`);
    }
  }
}
