import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cashPingSkips, transactions } from "@/db/schema";
import {
  cashOutDatesFromTransactions,
  isAfterCashPingTime,
  needsCashPing,
  riyadhToday,
} from "@/domain/cashPing";

export async function GET() {
  const todayDate = riyadhToday();
  const afterWorkEnd = isAfterCashPingTime();

  const rows = await db.select().from(transactions);
  const cashOutDates = cashOutDatesFromTransactions(rows);
  const needsPing = needsCashPing(todayDate, cashOutDates);

  const [skip] = await db
    .select()
    .from(cashPingSkips)
    .where(eq(cashPingSkips.date, todayDate))
    .limit(1);
  const skipped = Boolean(skip);

  return NextResponse.json({
    todayDate,
    needsPing,
    skipped,
    afterWorkEnd,
    showBanner: needsPing && afterWorkEnd && !skipped,
  });
}

export async function POST() {
  const todayDate = riyadhToday();
  await db
    .insert(cashPingSkips)
    .values({ date: todayDate })
    .onConflictDoNothing();

  return NextResponse.json({ skipped: true, todayDate });
}
