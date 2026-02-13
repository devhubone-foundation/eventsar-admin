// src/lib/api/experience-sponsors.ts
import { apiClient } from "@/lib/api/client";

export type WatermarkDto = {
  image_id?: number;
  position?: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
  scale?: number;
  opacity?: number;
};

export type ExperienceSponsorRow = {
  experience_sponsor_id: number;
  experience_id: number;
  sponsor_id: number;
  is_primary: boolean;
  sort_order: number;
  sponsor: {
    sponsor_id: number;
    name: string;
    logo_image?: { image_id: number; storage_path: string; name?: string | null; mime_type?: string | null } | null;
  };
  watermark_config_id?: number | null;
  watermark?: any | null;
};

export async function addExperienceSponsor(
  experienceId: string | number,
  payload: {
    sponsor_id: number;
    is_primary?: boolean;
    sort_order?: number;
    watermark_config_id?: number;
    watermark?: WatermarkDto;
  }
) {
  return apiClient<ExperienceSponsorRow>(`/api/admin/experiences/${experienceId}/sponsors`, {
    method: "POST",
    body: payload,
  });
}

export async function patchExperienceSponsor(
  experienceId: string | number,
  experienceSponsorId: string | number,
  payload: {
    is_primary?: boolean;
    sort_order?: number;
    watermark_config_id?: number | null;
    watermark?: WatermarkDto;
  }
) {
  return apiClient<ExperienceSponsorRow>(
    `/api/admin/experiences/${experienceId}/sponsors/${experienceSponsorId}`,
    { method: "PATCH", body: payload }
  );
}

export async function deleteExperienceSponsor(experienceId: string | number, experienceSponsorId: string | number) {
  return apiClient<{ ok: boolean }>(`/api/admin/experiences/${experienceId}/sponsors/${experienceSponsorId}`, {
    method: "DELETE",
  });
}
