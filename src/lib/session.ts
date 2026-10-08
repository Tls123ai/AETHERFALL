import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  username: string;
}

export const SESSION_COOKIE = "session";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [sess] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token));
  if (!sess) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, sess.userId));
  if (!user) return null;
  return { id: user.id, username: user.username };
}
