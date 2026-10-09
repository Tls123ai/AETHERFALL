import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { saves, userProgress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { CLASSES, MAPS } from "@/lib/game-data";

export const dynamic = "force-dynamic";

/**
 * Report a defeated boss (by any class). Verified against the
 * user's saves, then unlocks the class gated behind that boss:
 *   Map 1 boss  -> Mage
 *   Map 2 boss  -> Archer
 * Body: { mapIndex: number }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { mapIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const mapIndex = Math.floor(Number(body.mapIndex));
  if (!Number.isFinite(mapIndex) || mapIndex < 1 || !MAPS[mapIndex - 1])
    return NextResponse.json({ error: "Unknown map." }, { status: 400 });

  // verify: some class of this user actually defeated this map's boss
  const rows = await db
    .select({ defeatedBosses: saves.defeatedBosses })
    .from(saves)
    .where(eq(saves.userId, user.id));
  const verified = rows.some((r) =>
    (Array.isArray(r.defeatedBosses)
      ? (r.defeatedBosses as number[])
      : []
    ).includes(mapIndex)
  );
  if (!verified)
    return NextResponse.json(
      { error: "Boss defeat not found in your saves." },
      { status: 400 }
    );

  // which class unlocks behind this boss?
  const newly = CLASS_LIST_unlocksFor(mapIndex);

  const [row] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, user.id))
    .limit(1);
  const current: string[] = [
    "swordsman",
    ...((row?.unlockedClasses as string[]) ?? []),
  ].filter((c, i, a) => a.indexOf(c) === i);

  const added = newly.filter((c) => !current.includes(c));
  const unlocked = [...current, ...added];

  const [updated] = await db
    .update(userProgress)
    .set({ unlockedClasses: unlocked, updatedAt: new Date() })
    .where(eq(userProgress.userId, user.id))
    .returning();

  return NextResponse.json({
    unlockedClasses: updated.unlockedClasses,
    permLevels: updated.permLevels,
    newlyUnlocked: added,
  });
}

function CLASS_LIST_unlocksFor(mapIndex: number): string[] {
  return Object.values(CLASSES)
    .filter((c) => c.unlockBoss === mapIndex)
    .map((c) => c.id);
}
