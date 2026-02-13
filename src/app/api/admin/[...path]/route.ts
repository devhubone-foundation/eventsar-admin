import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/server-auth";
import { ApiError } from "@/lib/api/errors";

function toBackendPath(pathSegments: string[]) {
  return `/api/admin/${pathSegments.join("/")}`;
}

async function handler(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const backendPath = toBackendPath(params.path);
    const method = req.method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

    let body: unknown = undefined;

    if (method !== "GET") {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        body = await req.json();
      }
    }

    const data = await backendFetch<unknown>(backendPath, {
      method,
      body,
    });

    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json(
        { message: e.message, details: e.details },
        { status: e.status }
      );
    }

    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
