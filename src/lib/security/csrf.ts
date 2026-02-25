import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function readAllowedOriginsFromEnv(): Set<string> {
  const raw = process.env.CSRF_ALLOWED_ORIGINS?.trim();
  const configuredOrigins = raw
    ? raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;

  const normalizedOrigins = configuredOrigins
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));

  return new Set(normalizedOrigins);
}

const allowedOrigins = readAllowedOriginsFromEnv();

export function validateSameOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return null;

  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin || !allowedOrigins.has(normalizedOrigin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}
