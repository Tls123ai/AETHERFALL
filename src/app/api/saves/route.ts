import { NextResponse } from "next/server";
import { db } from "@/db";
import { saves } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { rowToSave, defaultSaveRow } from "@/lib/save";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(saves).where(eq(saves.userId, user.id));
  const list = rows.map(rowToSave);
  return NextResponse.json({ saves: list });
}
