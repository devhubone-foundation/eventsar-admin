import { config } from "@/lib/config";

export async function apiGet(path: string) {
  const url = `${config.apiBaseUrl}${path}`;

  const res = await fetch(url, {
    method: "GET",
    // IMPORTANT for future cookie auth:
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return data;
}
