import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { saves } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { defaultSaveRow, rowToSave, sanitizeIncoming } from "@/lib/save";
import { isClassId } from "@/lib/save";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { classId } = await params;
  if (!isClassId(classId))
    return NextResponse.json({ error: "Invalid class" }, { status: 400 });

  const [row] = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.classId, classId)))
    .limit(1);

  if (row) return NextResponse.json({ save: rowToSave(row) });

  const newRow = defaultSaveRow(user.id, classId);
  await db.insert(saves).values(newRow);
  return NextResponse.json({ save: rowToSave(newRow) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { classId } = await params;
  if (!isClassId(classId))
    return NextResponse.json({ error: "Invalid class" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const clean = sanitizeIncoming(body);
  if (!clean || clean.classId !== classId) {
    return NextResponse.json({ error: "Invalid save data" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.classId, classId)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(saves)
      .set({
        level: clean.level,
        xp: clean.xp,
        gold: clean.gold,
        resources: clean.resources,
        unlockedMaps: clean.unlockedMaps,
        defeatedBosses: clean.defeatedBosses,
        equippedWeapon: clean.equippedWeapon,
        ownedWeapons: clean.ownedWeapons,
        skillLevels: clean.skillLevels,
        updatedAt: new Date(),
      })
      .where(and(eq(saves.userId, user.id), eq(saves.classId, classId)))
      .returning();
    return NextResponse.json({ save: rowToSave(updated) });
  }

  const newRow = defaultSaveRow(user.id, classId);
  Object.assign(newRow, {
    level: clean.level,
    xp: clean.xp,
    gold: clean.gold,
    resources: clean.resources,
    unlockedMaps: clean.unlockedMaps,
    defeatedBosses: clean.defeatedBosses,
    equippedWeapon: clean.equippedWeapon,
    ownedWeapons: clean.ownedWeapons,
    skillLevels: clean.skillLevels,
  });
  const [inserted] = await db.insert(saves).values(newRow).returning();
  return NextResponse.json({ save: rowToSave(inserted) });
}
