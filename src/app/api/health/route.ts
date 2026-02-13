import { NextResponse } from "next/server";

type HealthSubsystem = {
  status?: string;
  [key: string]: unknown;
};

type HealthPayload = {
  status?: string;
  info?: Record<string, HealthSubsystem> | null;
  error?: Record<string, HealthSubsystem> | null;
  details?: Record<string, HealthSubsystem> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toSubsystemMap(value: unknown): Record<string, HealthSubsystem> {
  if (!isRecord(value)) return {};

  const out: Record<string, HealthSubsystem> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = isRecord(v) ? (v as HealthSubsystem) : { status: "unknown", value: v };
  }
  return out;
}

function normalizeHealthPayload(value: unknown): HealthPayload {
  if (!isRecord(value)) return {};

  return {
    status: typeof value.status === "string" ? value.status : undefined,
    info: toSubsystemMap(value.info),
    error: toSubsystemMap(value.error),
    details: toSubsystemMap(value.details),
  };
}

function mergeSubsystemMaps(
  ...maps: Array<Record<string, HealthSubsystem> | null | undefined>
): Record<string, HealthSubsystem> {
  const out: Record<string, HealthSubsystem> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [k, v] of Object.entries(map)) {
      out[k] = v;
    }
  }
  return out;
}

export async function GET(req: Request) {
  const frontendInfo: Record<string, HealthSubsystem> = {
    frontend: { status: "up" },
  };

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!base) {
    return NextResponse.json(
      {
        status: "error",
        info: frontendInfo,
        error: {
          backend: {
            status: "down",
            reason: "NEXT_PUBLIC_API_BASE_URL missing",
          },
        },
        details: frontendInfo,
      },
      { status: 503 }
    );
  }

  let backendHealthUrl: URL;
  try {
    backendHealthUrl = new URL("/api/health", base);
  } catch {
    return NextResponse.json(
      {
        status: "error",
        info: frontendInfo,
        error: {
          backend: {
            status: "down",
            reason: "NEXT_PUBLIC_API_BASE_URL invalid",
          },
        },
        details: frontendInfo,
      },
      { status: 503 }
    );
  }

  const requestUrl = new URL(req.url);
  if (
    backendHealthUrl.origin === requestUrl.origin &&
    backendHealthUrl.pathname === "/api/health"
  ) {
    return NextResponse.json(
      {
        status: "error",
        info: frontendInfo,
        error: {
          backend: {
            status: "down",
            reason:
              "NEXT_PUBLIC_API_BASE_URL points to this Next.js app; backend health target must be external",
          },
        },
        details: frontendInfo,
      },
      { status: 503 }
    );
  }

  try {
    const backendRes = await fetch(backendHealthUrl.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const text = await backendRes.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }

    const backend = normalizeHealthPayload(parsed);
    const backendStatus = (backend.status ?? "").toLowerCase();
    const backendOk = backendRes.ok && backendStatus === "ok";

    const info = mergeSubsystemMaps(frontendInfo, backend.info);
    const error = mergeSubsystemMaps(
      backend.error,
      backendOk
        ? null
        : {
            backend: {
              status: "down",
              statusCode: backendRes.status,
            },
          }
    );
    const details = mergeSubsystemMaps(frontendInfo, backend.details, backend.info);

    return NextResponse.json(
      {
        status: backendOk ? "ok" : "error",
        info,
        error,
        details,
      },
      { status: backendOk ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        info: frontendInfo,
        error: {
          backend: {
            status: "down",
            reason: err instanceof Error ? err.message : "request failed",
          },
        },
        details: frontendInfo,
      },
      { status: 503 }
    );
  }
}
