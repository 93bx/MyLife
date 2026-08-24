import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { cashBalance } from "@/domain/money";

export async function GET() {
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.at));

  const balanceSar = cashBalance(
    rows.map((t) => ({
      direction: t.direction as "in" | "out",
      amountSar: Number(t.amountSar),
    })),
  );

  return NextResponse.json({ balanceSar, transactions: rows });
}
