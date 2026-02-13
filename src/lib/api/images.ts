// src/lib/api/images.ts
// src/lib/api/images.ts
import { apiClient } from "@/lib/api/client";

export type ImageListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  mime_type?: string;
  mime_prefix?: string;
  scope?: "EVENT" | "SPONSOR" | "GLOBAL"; // optional
  createdFrom?: string;
  createdTo?: string;
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

export async function listImages(query: ImageListQuery) {
  const qs = toQueryString({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    q: query.q,
    mime_type: query.mime_type,
    mime_prefix: query.mime_prefix,
    scope: query.scope, // if backend ignores, ok
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
    sortBy: query.sortBy ?? "created_at",
    sortDir: query.sortDir ?? "desc",
  });

  return apiClient<{
    page: number;
    pageSize: number;
    total: number;
    items: Array<{
      image_id: number;
      name: string | null;
      storage_path: string;
      mime_type: string | null;
      width: number | null;
      height: number | null;
      scope?: "EVENT" | "SPONSOR" | "GLOBAL"; // optional in response
      created_at: string;
      updated_at: string;
    }>;
  }>(`/api/admin/images${qs}`);
}


export async function getImage(id: string) {
  return apiClient<unknown>(`/api/admin/images/${id}`);
}

export async function deleteImage(id: string) {
  return apiClient<{ image_id: number; storage_path: string }>(`/api/admin/images/${id}`, {
    method: "DELETE",
  });
}

export async function updateImageMetadata(
  id: number | string,
  payload: { name?: string; width?: number; height?: number }
) {
  return apiClient<unknown>(`/api/admin/images/${id}`, {
    method: "PATCH",
    body: payload,
  });
}
