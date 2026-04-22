import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { validateSameOrigin } from "@/lib/security/csrf";

const backendUrl = `${config.apiBaseUrl}/api/config/version`;

async function handler(req: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const method = req.method.toUpperCase();
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  const contentType = req.headers.get("content-type") ?? "";
  let rawBody = "";

  if (method !== "GET" && method !== "HEAD") {
    rawBody = await req.text();
  }

  if (rawBody && contentType && !contentType.includes("application/json")) {
    return NextResponse.json(
      { message: "Unsupported Content-Type (proxy supports JSON only)" },
      { status: 415 }
    );
  }

  const backendRes = await fetch(backendUrl, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: req.headers.get("accept") ?? "application/json",
      ...(rawBody ? { "Content-Type": "application/json" } : {}),
    },
    body: rawBody || undefined,
    cache: "no-store",
  });

  const text = await backendRes.text();
  const backendContentType = backendRes.headers.get("content-type") ?? "application/json";

  return new NextResponse(text, {
    status: backendRes.status,
    headers: { "content-type": backendContentType },
  });
}

export const GET = handler;
export const POST = handler;
