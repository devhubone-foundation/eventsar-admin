// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { validateSameOrigin } from "@/lib/security/csrf";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, {
    windowMs: 5 * 60 * 1000,
    max: 10,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { message: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json();

    const res = await fetch(`${config.apiBaseUrl}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // no credentials here; we're just proxying and storing cookie on Next.js side
    });

    if (!res.ok) {
      return NextResponse.json({ message: "Login failed" }, { status: res.status });
    }

    const data = (await res.json()) as { accessToken?: string };

    if (!data?.accessToken) {
      return NextResponse.json(
        { message: "Login response missing accessToken" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: data.accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: false, // IMPORTANT: you don't have HTTPS yet
      path: "/",
    });

    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
