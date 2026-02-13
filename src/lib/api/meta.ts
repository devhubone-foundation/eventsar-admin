// src/lib/api/meta.ts
import { apiClient } from "@/lib/api/client";

export type MetaResponse = {
  enums: Record<string, string[]>;
};

export async function getMeta() {
  return apiClient<MetaResponse>("/api/meta");
}
