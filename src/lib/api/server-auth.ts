// src/lib/api/server-auth.ts
import { getSessionToken } from "@/lib/auth/session";
import { ApiError, readJsonOrText } from "@/lib/api/errors";
import { config } from "@/lib/config";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function backendFetch<T>(
  backendPath: string,
  opts?: { method?: Method; body?: unknown; headers?: Record<string, string> }
): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new ApiError("Unauthorized", 401);

  const res = await fetch(`${config.apiBaseUrl}${backendPath}`, {
    method: opts?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const data = await readJsonOrText(res); // ✅ handles empty body too

  if (!res.ok) {
    throw new ApiError("Backend request failed", res.status, data);
  }

  // If backend returned empty body, data will be null — that's valid JSON to forward.
  return data as T;
}
