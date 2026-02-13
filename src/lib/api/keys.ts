// src/lib/api/keys.ts
export const qk = {
  events: (params: any) => ["events", params ?? {}] as const,
  event: (id: string | number) => ["event", String(id)] as const,

  eventSponsors: (eventId: string | number) => ["eventSponsors", String(eventId)] as const,

  sponsors: (params: any) => ["sponsors", params ?? {}] as const,
  sponsor: (id: string | number) => ["sponsor", id] as const,

  images: (params?: unknown) => ["images", params] as const,
  image: (id: string | number) => ["image", id] as const,

  models: (params?: unknown) => ["models", params] as const,
  model: (id: string | number) => ["model", id] as const,

  experiences: (eventId: string | number, params?: unknown) =>
    ["experiences", eventId, params] as const,
  experience: (id: string | number) => ["experience", id] as const,

  eventExperiences: (eventId: string | number) => ["eventExperiences", String(eventId)] as const,

  metrics: (eventId: string | number, params?: unknown) => ["metrics", eventId, params] as const,
  meta: () => ["meta"] as const,
};
