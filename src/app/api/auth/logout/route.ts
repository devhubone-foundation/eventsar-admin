// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { validateSameOrigin } from "@/lib/security/csrf";

export async function POST(req: Request) {
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return res;
}
