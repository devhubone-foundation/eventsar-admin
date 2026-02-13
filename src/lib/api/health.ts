import { apiClient } from "@/lib/api/client";

export type HealthSubsystem = {
  status?: string;
  [key: string]: unknown;
};

export type HealthResponse = {
  status?: string;
  info?: Record<string, HealthSubsystem> | null;
  error?: Record<string, HealthSubsystem> | null;
  details?: Record<string, HealthSubsystem> | null;
};

export async function getHealth() {
  return apiClient<HealthResponse>("/api/health");
}
