import { apiClient } from "@/lib/api/client";

export type MetricType = "EVENT_OPEN" | "EXPERIENCE_OPEN" | "CAPTURE";

export type EventMetricsQuery = {
  from?: string;
  to?: string;
  type?: MetricType;
  experienceSlug?: string;
};

export type EventMetricRow = {
  day: string;
  type: MetricType;
  count: number;
  experience: null | {
    experience_id: number;
    slug: string;
  };
};

function toQueryString(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    sp.set(k, v);
  }
  const out = sp.toString();
  return out ? `?${out}` : "";
}

export async function getEventMetrics(eventId: string, query?: EventMetricsQuery) {
  const qs = toQueryString({
    from: query?.from,
    to: query?.to,
    type: query?.type,
    experienceSlug: query?.experienceSlug,
  });
  return apiClient<EventMetricRow[]>(`/api/admin/events/${eventId}/metrics${qs}`);
}
