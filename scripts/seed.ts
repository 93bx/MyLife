/**
 * Seed Profile and money recurrence templates only.
 *
 * Values come from design spec §2 (docs/superpowers/specs/2026-08-24-mylife-design.md)
 * and are editable in Profile after seed — not hardcoded app constants.
 *
 * Does not seed projects or goals; create those in the app.
 *
 * Run: npx tsx scripts/seed.ts
 *
 * Idempotent: skips inserts when a singleton profile already exists, and when
 * templates already exist by title.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { profiles, recurrenceTemplates } from "../src/db/schema";

const TEMPLATES = [
  {
    title: "Confirm salary received",
    rruleOrKind: "monthly",
    resources: "money",
    type: "confirm_income",
    plannedSar: "7000",
  },
  {
    title: "Bills share",
    rruleOrKind: "monthly",
    resources: "money",
    type: "pay",
    plannedSar: "1500",
  },
  {
    title: "Rent share",
    rruleOrKind: "yearly",
    resources: "money",
    type: "pay",
    plannedSar: "5000",
  },
  {
    title: "Iqama / sponsor",
    rruleOrKind: "yearly",
    resources: "money",
    type: "pay",
    plannedSar: "7500",
  },
  {
    title: "Evening cash ping",
    rruleOrKind: "daily",
    resources: "time",
    type: "log_cash",
    plannedSar: null,
  },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url);
  const db = drizzle(client);

  try {
    const existingProfiles = await db.select({ id: profiles.id }).from(profiles).limit(1);
    if (existingProfiles.length === 0) {
      await db.insert(profiles).values({
        fullName: "Mousab Yousif",
        summary:
          "Full-stack software engineer at Smart Management Solutions (SMS), Riyadh. Generalist; dual path FTE + contracting.",
        workStart: "09:30",
        workEnd: "17:30",
        timezone: "Asia/Riyadh",
        salarySar: "7000",
        rentShareYearlySar: "5000",
        billsShareMinSar: "1000",
        billsShareMaxSar: "1500",
        iqamaYearlySar: "7500",
        cashBufferSar: "0",
        geoSequence: "remote_abroad,other_gcc,west",
        nightsDefaultOn: true,
        smsFirstDefault: true,
        weekend: "fri-sat",
        github: "github.com/93bx",
        noticeDays: 30,
        allowTrainOnFreeNonMoney: false,
        payoutMethods: "[]",
      });
      console.log("Inserted profile (Mousab Yousif)");
    } else {
      console.log("Profile already exists — skipped");
    }

    for (const t of TEMPLATES) {
      const found = await db
        .select({ id: recurrenceTemplates.id })
        .from(recurrenceTemplates)
        .where(eq(recurrenceTemplates.title, t.title))
        .limit(1);
      if (found.length === 0) {
        await db.insert(recurrenceTemplates).values({
          title: t.title,
          rruleOrKind: t.rruleOrKind,
          resources: t.resources,
          type: t.type,
          plannedSar: t.plannedSar,
          enabled: true,
        });
        console.log(`Inserted template: ${t.title}`);
      } else {
        console.log(`Template exists — skipped: ${t.title}`);
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
