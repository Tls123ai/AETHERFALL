import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  const res = NextResponse.json({ ok: true });
  if (user) {
    const store = await (await import("next/headers")).cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
  }
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
