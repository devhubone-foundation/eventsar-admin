// src/lib/storage.ts
import { config } from "@/lib/config";

export function getStorageUrl(storage_path: string): string {
  const base = config.storageBaseUrl.replace(/\/+$/, "");
  const path = storage_path.replace(/^\/+/, "");
  return `${base}/${path}`;
}
