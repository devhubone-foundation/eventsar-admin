import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSessionToken } from "@/lib/auth/session";
import { validateSameOrigin } from "@/lib/security/csrf";

function toBackendPath(pathSegments: string[]) {
  return `/api/admin/${pathSegments.join("/")}`;
}

async function handler(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { path } = await ctx.params;

  // preserve query string
  const url = new URL(req.url);
  const qs = url.search;

  const backendUrl = `${config.apiBaseUrl}${toBackendPath(path)}${qs}`;
  const method = req.method.toUpperCase();
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  // ✅ Read body safely (some clients send Content-Type with empty body)
  const contentType = req.headers.get("content-type") ?? "";
  let rawBody = "";

  if (method !== "GET" && method !== "HEAD") {
    // reading text is safe even if empty
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
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
