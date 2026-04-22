// src/lib/api/experiences.ts
import { apiClient } from "@/lib/api/client";

export type ExperienceWatermarkDto = {
  image_id?: number;
  position?: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
  scale?: number;
  opacity?: number;
};

export type EventExperienceListItem = {
  experience_id: number;
  slug: string;
  type: string;
  status: string;
  sort_order: number;
  thumbnail_image?: { storage_path: string } | null;
  localizations?: Array<{ language: "EN" | "BG"; display_name: string }>;
  watermark_config?: {
    image_id?: number;
    image?: { image_id?: number } | null;
  } | null;
  thumbnail_image_id?: number | null;
  tracking_image_id?: number | null;
};

export type EventExperienceListResponse = {
  page?: number;
  pageSize?: number;
  total?: number;
  items: EventExperienceListItem[];
};

export type ExperienceDetail = {
  experience_id?: number;
  id?: number;
  event_id?: number | string;
  slug?: string;
  type?: string;
  status?: string;
  watermark_config_id?: number | null;
  updated_at?: string | null;
  watermark_config?: {
    image_id?: number;
    image?: { image_id?: number } | null;
    position?: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
    scale?: number;
    opacity?: number;
  } | null;
  localizations?: Array<{ id?: number; experience_id?: number; language: "EN" | "BG"; display_name: string }>;
  Experience_Localization?: Array<{ id?: number; experience_id?: number; language: "EN" | "BG"; display_name: string }>;
  sponsors?: unknown[];
  experience_sponsors?: unknown[];
  Experience_Sponsors?: unknown[];
  [key: string]: unknown;
};

export type CreateExperienceResponse = {
  experience_id?: number;
  id?: number;
  [key: string]: unknown;
};

export async function listEventExperiences(eventId: string, query?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  type?: string;
  model_id?: number | string;
  image_id?: number | string;
  sortBy?: "created_at" | "sort_order" | "slug";
  sortDir?: "asc" | "desc";
}) {
  const sp = new URLSearchParams();
  if (query?.page) sp.set("page", String(query.page));
  if (query?.pageSize) sp.set("pageSize", String(query.pageSize));
  if (query?.q) sp.set("q", query.q);
  if (query?.status) sp.set("status", query.status);
  if (query?.type) sp.set("type", query.type);
  if (query?.model_id !== undefined) sp.set("model_id", String(query.model_id));
  if (query?.image_id !== undefined) sp.set("image_id", String(query.image_id));
  if (query?.sortBy) sp.set("sortBy", query.sortBy);
  if (query?.sortDir) sp.set("sortDir", query.sortDir);

  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiClient<EventExperienceListResponse>(
    `/api/admin/events/${eventId}/experiences${qs}`
  );
}

export async function reorderEventExperiences(
  eventId: string,
  items: Array<{ experience_id: number; sort_order: number }>
) {
  return apiClient<{ ok: boolean }>(`/api/admin/events/${eventId}/experiences/reorder`, {
    method: "PATCH",
    body: { items },
  });
}

export async function createExperience(
  eventId: string,
  payload: {
    slug: string;
    type: string;
    // optional fields supported by CreateExperienceDto:
    status?: string;
    sort_order?: number;
    thumbnail_image_id?: number;
    model_id?: number;
    tracking_image_id?: number;
    physical_width_meters?: number;
    placement_position_offset?: { x: number; y: number; z: number };
    placement_rotation_euler?: { x: number; y: number; z: number };
    placement_scale?: number;
    face_anchor?: string;
    watermark_config_id?: number;
  }
) {
  return apiClient<CreateExperienceResponse>(`/api/admin/events/${eventId}/experiences`, {
    method: "POST",
    body: payload,
  });
}

export async function getExperience(id: string) {
  return apiClient<ExperienceDetail>(`/api/admin/experiences/${id}`);
}

export async function patchExperienceWatermark(
  id: string | number,
  payload: {
    watermark_config_id?: number | null;
    watermark?: ExperienceWatermarkDto;
  }
) {
  return apiClient<unknown>(`/api/admin/experiences/${id}`, {
    method: "PATCH",
    body: payload,
  });
}
