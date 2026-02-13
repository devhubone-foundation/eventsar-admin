// src/lib/api/experience-localizations.ts
import { apiClient } from "@/lib/api/client";

export type ExperienceLocalizationRow = {
  id?: number;
  experience_id?: number;
  language: "EN" | "BG";
  display_name: string;
};

const PATH = (experienceId: string | number, language: "EN" | "BG") =>
  `/api/admin/experiences/${experienceId}/localizations/${language}`;

/**
 * PUT /api/admin/experiences/{id}/localizations/{language}
 * Upsert experience localization
 */
export async function upsertExperienceLocalization(
  experienceId: string | number,
  language: "EN" | "BG",
  payload: { display_name: string }
) {
  return apiClient<ExperienceLocalizationRow>(PATH(experienceId, language), {
    method: "PUT",
    body: { language, display_name: payload.display_name },
  });
}

/**
 * Only keep this if your backend supports delete.
 * If Swagger doesn't have it, remove usage from the UI.
 */
export async function deleteExperienceLocalization(experienceId: string | number, language: "EN" | "BG") {
  return apiClient<{ ok: boolean }>(PATH(experienceId, language), {
    method: "DELETE",
  });
}
