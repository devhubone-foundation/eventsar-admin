import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function validateSameOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return null;

  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const requestUrl = new URL(req.url);
  if (origin !== requestUrl.origin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}
