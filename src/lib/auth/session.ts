// src/lib/auth/session.ts
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "access_token";

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function isAuthed(): Promise<boolean> {
  return Boolean(await getSessionToken());
}
