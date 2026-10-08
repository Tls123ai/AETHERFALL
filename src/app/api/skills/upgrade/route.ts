import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { saves } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { rowToSave, sanitizeIncoming } from "@/lib/save";
import { SKILLS, CLASSES } from "@/lib/game-data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { skillId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const skillId = body.skillId ?? "";
  const skill = SKILLS[skillId];
  if (!skill) {
    return NextResponse.json({ error: "Unknown skill." }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.classId, skill.classId)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "No save for this class." }, { status: 404 });
  }
  const save = rowToSave(row);
  const current = save.skillLevels[skillId] ?? 1;
  if (current >= skill.maxLevel) {
    return NextResponse.json({ error: "Skill already maxed." }, { status: 400 });
  }
  if (save.resources < skill.upgradeCost) {
    return NextResponse.json({ error: "Not enough resources." }, { status: 400 });
  }

  save.resources -= skill.upgradeCost;
  save.skillLevels = { ...save.skillLevels, [skillId]: current + 1 };
  const clean = sanitizeIncoming(save)!;

  const [updated] = await db
    .update(saves)
    .set({
      resources: clean.resources,
      skillLevels: clean.skillLevels,
      updatedAt: new Date(),
    })
    .where(and(eq(saves.userId, user.id), eq(saves.classId, skill.classId)))
    .returning();

  return NextResponse.json({ save: rowToSave(updated) });
}
