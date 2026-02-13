// src/lib/api/models.ts
import { apiClient } from "@/lib/api/client";

export type ModelListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  type?: string; // keep raw enum internally; UI translates labels only
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

export async function listModels(query: ModelListQuery) {
  const qs = toQueryString({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    q: query.q,
    type: query.type,
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
      model_id: number;
      name: string | null;
      type: string;
      version: number | null;
      file_size_bytes: number | null;
      storage_path: string;
      created_at: string;
      updated_at: string;
    }>;
  }>(`/api/admin/models${qs}`);
}

export async function getModel(id: string) {
  return apiClient<any>(`/api/admin/models/${id}`);
}

export async function deleteModel(id: string) {
  return apiClient<any>(`/api/admin/models/${id}`, { method: "DELETE" });
}
