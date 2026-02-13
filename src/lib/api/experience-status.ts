// src/lib/api/experience-status.ts
import { apiClient } from "@/lib/api/client";

/**
 * PATCH /api/admin/experiences/{id}/status
 * Body: { status: string }
 */
export async function setExperienceStatus(id: string | number, status: string) {
  return apiClient(`/api/admin/experiences/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}
