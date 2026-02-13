// src/lib/api/sponsors.ts
import { apiClient } from "@/lib/api/client";

export type SponsorListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
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

export async function listSponsors(query: SponsorListQuery) {
  const qs = toQueryString({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    q: query.q,
    sortBy: query.sortBy ?? "created_at",
    sortDir: query.sortDir ?? "desc",
  });
  return apiClient<unknown>(`/api/admin/sponsors${qs}`);
}

export async function getSponsor(id: string | number) {
  return apiClient<unknown>(`/api/admin/sponsors/${id}`);
}

export type WatermarkDto = {
  image_id?: number;
  position?: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
  scale?: number;
  opacity?: number;
};

export async function createSponsor(payload: {
  name: string;
  website_url?: string;
  logo_image_id: number;
  watermark?: WatermarkDto;
}) {
  return apiClient<unknown>(`/api/admin/sponsors`, {
    method: "POST",
    body: payload,
  });
}

// ✅ add this
export async function patchSponsor(
  sponsorId: number,
  payload: {
    name?: string;
    website_url?: string | null;
    logo_image_id?: number | null;
    watermark?: WatermarkDto | null;
  }
) {
  return apiClient<unknown>(`/api/admin/sponsors/${sponsorId}`, {
    method: "PATCH",
    body: payload,
  });
}
