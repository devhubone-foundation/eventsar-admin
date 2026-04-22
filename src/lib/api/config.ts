import { apiClient } from "@/lib/api/client";

export type VersionConfig = {
  key: string;
  value: string;
  note: string | null;
};

export async function getVersionConfig() {
  return apiClient<VersionConfig>("/api/config/version");
}

export async function upsertVersionConfig(payload: {
  value: string;
  note?: string | null;
}) {
  return apiClient<VersionConfig>("/api/config/version", {
    method: "POST",
    body: payload,
  });
}
