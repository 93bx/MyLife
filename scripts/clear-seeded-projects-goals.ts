/**
 * One-shot: delete legacy SMS projects and starter goals by known titles only.
 * Does not wipe arbitrary user-created projects/goals.
 *
 * Run: npx tsx scripts/clear-seeded-projects-goals.ts
 */
import "dotenv/config";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  goalProjects,
  goals,
  notes,
  projects,
  tasks,
} from "../src/db/schema";

const SEEDED_PROJECT_TITLES = [
  "Tijarah 360",
  "KAU labs",
  "Mawani BCM",
  "Moktamel",
] as const;

const SEEDED_GOAL_TITLES = [
  "Build cash buffer",
  "Remote pay from abroad",
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url);
  const db = drizzle(client);

  try {
    const projectRows = await db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(inArray(projects.title, [...SEEDED_PROJECT_TITLES]));

    const goalRows = await db
      .select({ id: goals.id, title: goals.title })
      .from(goals)
      .where(inArray(goals.title, [...SEEDED_GOAL_TITLES]));

    const projectIds = projectRows.map((r) => r.id);
    const goalIds = goalRows.map((r) => r.id);

    if (projectIds.length === 0 && goalIds.length === 0) {
      console.log("No seeded projects/goals found — nothing to delete");
      return;
    }

    if (projectIds.length > 0 || goalIds.length > 0) {
      // Detach FKs so title-only deletes do not fail on linked rows.
      if (projectIds.length > 0) {
        await db
          .update(tasks)
          .set({ projectId: null })
          .where(inArray(tasks.projectId, projectIds));
        await db
          .update(notes)
          .set({ projectId: null })
          .where(inArray(notes.projectId, projectIds));
        await db
          .delete(goalProjects)
          .where(inArray(goalProjects.projectId, projectIds));
      }
      if (goalIds.length > 0) {
        await db
          .update(tasks)
          .set({ goalId: null })
          .where(inArray(tasks.goalId, goalIds));
        await db
          .update(notes)
          .set({ goalId: null })
          .where(inArray(notes.goalId, goalIds));
        await db
          .delete(goalProjects)
          .where(inArray(goalProjects.goalId, goalIds));
      }
    }

    if (projectIds.length > 0) {
      await db.delete(projects).where(inArray(projects.id, projectIds));
      for (const row of projectRows) {
        console.log(`Deleted project: ${row.title}`);
      }
    }

    if (goalIds.length > 0) {
      await db.delete(goals).where(inArray(goals.id, goalIds));
      for (const row of goalRows) {
        console.log(`Deleted goal: ${row.title}`);
      }
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
