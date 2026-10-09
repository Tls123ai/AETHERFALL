import { NextResponse } from "next/server";
import { db } from "@/db";
import { userProgress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { isClassId } from "@/lib/save";

export const dynamic = "force-dynamic";

function normClasses(v: unknown): string[] {
  const valid = ["swordsman", "mage", "archer"];
  const arr = (Array.isArray(v) ? v : []).filter((c) =>
    valid.includes(String(c))
  ) as string[];
  if (!arr.includes("swordsman")) arr.unshift("swordsman");
  return [...new Set(arr)];
}

function normPerms(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const n = Math.floor(Number(val));
      if (Number.isFinite(n)) out[k] = Math.min(5, Math.max(0, n));
    }
  }
  return out;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let [row] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, user.id))
    .limit(1);

  if (!row) {
    const [inserted] = await db
      .insert(userProgress)
      .values({ userId: user.id })
      .returning();
    row = inserted;
  }

  return NextResponse.json({
    unlockedClasses: normClasses(row.unlockedClasses),
    permLevels: normPerms(row.permLevels),
  });
}
