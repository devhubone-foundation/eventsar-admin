// src/lib/api/experience-update.ts
import { apiClient } from "@/lib/api/client";

/**
 * PATCH /api/admin/experiences/{id}
 * Body: UpdateExperienceDto
 */
export async function updateExperience(id: string | number, payload: Record<string, unknown>) {
  return apiClient(`/api/admin/experiences/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

/** Utility: remove undefined fields so we don't accidentally overwrite */
export function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
