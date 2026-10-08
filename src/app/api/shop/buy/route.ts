import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { saves } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { rowToSave, sanitizeIncoming } from "@/lib/save";
import { WEAPONS, CLASSES } from "@/lib/game-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { weaponId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const weaponId = body.weaponId ?? "";
  const weapon = WEAPONS[weaponId];
  if (!weapon) {
    return NextResponse.json({ error: "Unknown weapon." }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.classId, weapon.classId)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "No save for this class." }, { status: 404 });
  }
  const save = rowToSave(row);
  if (save.ownedWeapons.includes(weaponId)) {
    return NextResponse.json({ error: "Already owned." }, { status: 400 });
  }
  if (save.gold < weapon.price) {
    return NextResponse.json({ error: "Not enough gold." }, { status: 400 });
  }

  save.gold -= weapon.price;
  save.ownedWeapons = [...save.ownedWeapons, weaponId];
  const clean = sanitizeIncoming(save)!;

  const [updated] = await db
    .update(saves)
    .set({
      gold: clean.gold,
      ownedWeapons: clean.ownedWeapons,
      updatedAt: new Date(),
    })
    .where(and(eq(saves.userId, user.id), eq(saves.classId, weapon.classId)))
    .returning();

  return NextResponse.json({ save: rowToSave(updated) });
}
