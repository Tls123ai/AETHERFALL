import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { saves, userProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { isClassId, rowToSave } from "@/lib/save";
import { getPermDef, permCost } from "@/lib/game-data";

export const dynamic = "force-dynamic";

/**
 * Upgrade a permanent account-level upgrade.
 * Cost is paid from the active hero's (classId) purse.
 * Body: { permId: string, classId: ClassId }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { permId?: string; classId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const def = getPermDef(body.permId ?? "");
  if (!def)
    return NextResponse.json({ error: "Unknown upgrade." }, { status: 400 });
  if (!isClassId(body.classId))
    return NextResponse.json({ error: "Invalid class." }, { status: 400 });

  // load/insert progress row
  const [progress] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, user.id))
    .limit(1);
  const perms: Record<string, number> = {
    ...((progress?.permLevels as Record<string, number>) ?? {}),
  };
  const current = Math.min(5, Math.max(0, Math.floor(perms[def.id] || 0)));
  if (current >= def.maxLevel)
    return NextResponse.json(
      { error: "Upgrade already maxed." },
      { status: 400 }
    );
  const cost = permCost(def, current);

  // load the paying class save
  const [saveRow] = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.classId, body.classId)))
    .limit(1);
  if (!saveRow)
    return NextResponse.json(
      { error: "No save for this class." },
      { status: 404 }
    );
  const save = rowToSave(saveRow);
  if (save.gold < cost.gold)
    return NextResponse.json({ error: "Not enough gold." }, { status: 400 });
  if (save.resources < cost.resources)
    return NextResponse.json(
      { error: "Not enough resources." },
      { status: 400 }
    );

  save.gold -= cost.gold;
  save.resources -= cost.resources;
  const [updatedSave] = await db
    .update(saves)
    .set({
      gold: save.gold,
      resources: save.resources,
      updatedAt: new Date(),
    })
    .where(and(eq(saves.userId, user.id), eq(saves.classId, body.classId)))
    .returning();

  perms[def.id] = current + 1;
  const [updatedProgress] = await db
    .update(userProgress)
    .set({
      permLevels: perms,
      updatedAt: new Date(),
    })
    .where(eq(userProgress.userId, user.id))
    .returning();

  return NextResponse.json({
    save: rowToSave(updatedSave),
    permLevels: updatedProgress.permLevels,
    upgrade: { id: def.id, level: current + 1 },
  });
}
