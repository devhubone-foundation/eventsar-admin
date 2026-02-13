// src/lib/api/events.ts
import { apiClient } from "@/lib/api/client";

export type EventListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  sortBy?: "created_at" | "name";
  sortDir?: "asc" | "desc";
};

function toQueryString(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listEvents(query: EventListQuery) {
  const qs = toQueryString({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    q: query.q,
    status: query.status,
    sortBy: query.sortBy ?? "created_at",
    sortDir: query.sortDir ?? "desc",
  });

  return apiClient<{
    page: number;
    pageSize: number;
    total: number;
    items: any[];
  }>(`/api/admin/events${qs}`);
}

export async function createEvent(payload: { slug: string; status?: "DRAFT" }) {
  return apiClient<any>(`/api/admin/events`, { method: "POST", body: payload });
}

export async function getEvent(id: string) {
  return apiClient<any>(`/api/admin/events/${id}`);
}

/**
 * Swagger: PATCH /admin/events/:id edits ONLY mutable metadata fields
 * (slug + status are not edited here)
 */
export async function patchEvent(id: string, payload: {
  code?: string | null;
  timezone?: string | null;
  website_url?: string | null;
  support_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  logo_image_id?: number | null;
  background_image_id?: number | null;
  watermark_config_id?: number | null;
  environment?: string | null;
  start_at?: string | null; // ISO
  end_at?: string | null;   // ISO
  about_url?: string | null;
  rules_url?: string | null;
  terms_url?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  return apiClient<any>(`/api/admin/events/${id}`, { method: "PATCH", body: payload });
}

/**
 * Swagger: PATCH /admin/events/:id/status
 */
export async function patchEventStatus(id: string, payload: { status: string }) {
  return apiClient<any>(`/api/admin/events/${id}/status`, { method: "PATCH", body: payload });
}

// Event sponsors
export async function attachEventSponsor(eventId: string, payload: { sponsor_id: number }) {
  return apiClient<any>(`/api/admin/events/${eventId}/sponsors`, { method: "POST", body: payload });
}

export async function deleteEventSponsor(eventId: string, eventSponsorId: string) {
  return apiClient<any>(`/api/admin/events/${eventId}/sponsors/${eventSponsorId}`, { method: "DELETE" });
}

export async function putEventLocalization(
  eventId: string,
  language: "EN" | "BG",
  payload: {
    name: string;
    description?: string | null;
    venue_name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  }
) {
  return apiClient<any>(`/api/admin/events/${eventId}/localizations/${language}`, {
    method: "PUT",
    body: payload,
  });
}

