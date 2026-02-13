import { ApiError, readJsonOrText } from "@/lib/api/errors";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function apiClient<T>(
  path: string,
  opts?: { method?: Method; body?: unknown; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(path, {
    method: opts?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });

  const data = await readJsonOrText(res); // ✅ safe for empty

  if (!res.ok) {
    throw new ApiError("Request failed", res.status, data);
  }

  return data as T;
}
