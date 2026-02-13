// src/app/[lang]/admin/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

import { useI18n } from "@/components/i18n-provider";
import { listEvents } from "@/lib/api/events";
import { getHealth } from "@/lib/api/health";
import { listImages } from "@/lib/api/images";
import { qk } from "@/lib/api/keys";
import { listModels } from "@/lib/api/models";
import { listSponsors } from "@/lib/api/sponsors";
import { getStorageUrl } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardEvent = {
  id: string;
  slug: string;
  status: string;
  code: string | null;
  createdAt: string | null;
};

function pickFromRecord(raw: unknown, key: string): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as Record<string, unknown>)[key];
}

function getTotal(raw: unknown): number {
  const total = pickFromRecord(raw, "total");
  if (typeof total === "number" && Number.isFinite(total)) return total;

  const items = pickFromRecord(raw, "items");
  if (Array.isArray(items)) return items.length;
  if (Array.isArray(raw)) return raw.length;
  return 0;
}

function normalizeEventRows(rawItems: unknown[]): DashboardEvent[] {
  return rawItems
    .map((item) => {
      const id = pickFromRecord(item, "event_id") ?? pickFromRecord(item, "id");
      const slug = pickFromRecord(item, "slug");
      if ((typeof id !== "string" && typeof id !== "number") || typeof slug !== "string") return null;

      return {
        id: String(id),
        slug,
        status: String(pickFromRecord(item, "status") ?? "-"),
        code: typeof pickFromRecord(item, "code") === "string" ? String(pickFromRecord(item, "code")) : null,
        createdAt: typeof pickFromRecord(item, "created_at") === "string" ? String(pickFromRecord(item, "created_at")) : null,
      };
    })
    .filter((x): x is DashboardEvent => Boolean(x));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function inferImageScope(scope: string | undefined, storagePath: string) {
  if (scope) return scope;
  const root = storagePath.split("/").find(Boolean)?.toUpperCase();
  if (root === "EVENT" || root === "EVENTS") return "EVENT";
  if (root === "SPONSOR" || root === "SPONSORS") return "SPONSOR";
  if (root === "GLOBAL") return "GLOBAL";
  return "-";
}

function inferEventSlugFromPath(storagePath: string) {
  const parts = storagePath.split("/").filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i].toLowerCase() === "events" || parts[i].toLowerCase() === "event") {
      return parts[i + 1] ?? "-";
    }
  }
  return "-";
}

function getFailedSubsystems(health: {
  status?: string;
  error?: Record<string, { status?: string } | undefined> | null;
  details?: Record<string, { status?: string } | undefined> | null;
}) {
  const failed = new Set<string>();

  const scan = (obj: Record<string, { status?: string } | undefined> | null | undefined) => {
    if (!obj) return;
    for (const [name, val] of Object.entries(obj)) {
      if (val?.status && val.status.toLowerCase() !== "up") failed.add(name);
    }
  };

  scan(health.error);
  scan(health.details);
  if ((health.status ?? "").toLowerCase() === "error" && failed.size === 0) return ["unknown"];
  return [...failed];
}

export default function AdminHomePage() {
  const { lang, t } = useI18n();

  const healthQ = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: 1,
  });

  const eventsCountQ = useQuery({
    queryKey: qk.events({ page: 1, pageSize: 1 }),
    queryFn: () => listEvents({ page: 1, pageSize: 1 }),
  });

  const sponsorsCountQ = useQuery({
    queryKey: qk.sponsors({ page: 1, pageSize: 1 }),
    queryFn: () => listSponsors({ page: 1, pageSize: 1 }),
  });

  const imagesCountQ = useQuery({
    queryKey: qk.images({ page: 1, pageSize: 1 }),
    queryFn: () => listImages({ page: 1, pageSize: 1 }),
  });

  const modelsCountQ = useQuery({
    queryKey: qk.models({ page: 1, pageSize: 1 }),
    queryFn: () => listModels({ page: 1, pageSize: 1 }),
  });

  const recentEventsQ = useQuery({
    queryKey: qk.events({ page: 1, pageSize: 5, sortBy: "created_at", sortDir: "desc" }),
    queryFn: () => listEvents({ page: 1, pageSize: 5, sortBy: "created_at", sortDir: "desc" }),
  });

  const recentImagesQ = useQuery({
    queryKey: qk.images({ page: 1, pageSize: 6, sortBy: "created_at", sortDir: "desc" }),
    queryFn: () => listImages({ page: 1, pageSize: 6, sortBy: "created_at", sortDir: "desc" }),
  });

  const recentModelsQ = useQuery({
    queryKey: qk.models({ page: 1, pageSize: 6, sortBy: "created_at", sortDir: "desc" }),
    queryFn: () => listModels({ page: 1, pageSize: 6, sortBy: "created_at", sortDir: "desc" }),
  });

  const healthStatus = (healthQ.data?.status ?? "unknown").toLowerCase();
  const healthFailedSubsystems = getFailedSubsystems({
    status: healthQ.data?.status,
    error: healthQ.data?.error as Record<string, { status?: string } | undefined> | null | undefined,
    details: healthQ.data?.details as Record<string, { status?: string } | undefined> | null | undefined,
  });

  const recentEvents = normalizeEventRows(recentEventsQ.data?.items ?? []);
  const recentImages = recentImagesQ.data?.items ?? [];
  const recentModels = recentModelsQ.data?.items ?? [];

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("admin.dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.subtitle")}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2">
          <CardHeader className="pb-0">
            <CardDescription>{t("admin.dashboard.eventsTotal")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {eventsCountQ.isLoading ? t("common.loading") : getTotal(eventsCountQ.data).toLocaleString()}
            {eventsCountQ.error ? <div className="text-xs text-red-600 font-normal mt-1">{t("admin.dashboard.failedInline")}</div> : null}
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="pb-0">
            <CardDescription>{t("admin.dashboard.sponsorsTotal")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {sponsorsCountQ.isLoading ? t("common.loading") : getTotal(sponsorsCountQ.data).toLocaleString()}
            {sponsorsCountQ.error ? <div className="text-xs text-red-600 font-normal mt-1">{t("admin.dashboard.failedInline")}</div> : null}
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="pb-0">
            <CardDescription>{t("admin.dashboard.imagesTotal")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {imagesCountQ.isLoading ? t("common.loading") : getTotal(imagesCountQ.data).toLocaleString()}
            {imagesCountQ.error ? <div className="text-xs text-red-600 font-normal mt-1">{t("admin.dashboard.failedInline")}</div> : null}
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="pb-0">
            <CardDescription>{t("admin.dashboard.modelsTotal")}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {modelsCountQ.isLoading ? t("common.loading") : getTotal(modelsCountQ.data).toLocaleString()}
            {modelsCountQ.error ? <div className="text-xs text-red-600 font-normal mt-1">{t("admin.dashboard.failedInline")}</div> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.recentEventsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEventsQ.error ? <div className="text-sm text-red-600">{t("admin.dashboard.failedInline")}</div> : null}
            {recentEventsQ.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> : null}
            {!recentEventsQ.isLoading && !recentEventsQ.error ? (
              <div className="max-h-80 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">{t("events.slug")}</th>
                      <th className="p-3">{t("events.status")}</th>
                      <th className="p-3">{t("admin.dashboard.code")}</th>
                      <th className="p-3">{t("admin.dashboard.createdAt")}</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((event) => (
                      <tr key={event.id} className="border-t">
                        <td className="p-3">{event.slug}</td>
                        <td className="p-3">{event.status}</td>
                        <td className="p-3">{event.code ?? "-"}</td>
                        <td className="p-3">{formatDate(event.createdAt)}</td>
                        <td className="p-3 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/${lang}/admin/events/${event.id}`}>{t("events.open")}</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {recentEvents.length === 0 ? (
                      <tr>
                        <td className="p-3 text-muted-foreground" colSpan={5}>{t("admin.dashboard.noData")}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.dashboard.healthTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthQ.error ? <div className="text-sm text-red-600">{t("admin.dashboard.failedInline")}</div> : null}
              {healthQ.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> : null}
              {!healthQ.isLoading && !healthQ.error ? (
                <>
                  <Badge className={healthStatus === "ok" ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-red-600 text-white hover:bg-red-600"}>
                    {healthStatus}
                  </Badge>
                  {healthStatus !== "ok" && healthFailedSubsystems.length > 0 ? (
                    <div className="text-sm">
                      {t("admin.dashboard.failedSystems")}: {healthFailedSubsystems.join(", ")}
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.dashboard.quickActionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline"><Link href={`/${lang}/admin/events`}>{t("admin.dashboard.createEvent")}</Link></Button>
              <Button asChild variant="outline"><Link href={`/${lang}/admin/assets/upload`}>{t("admin.dashboard.uploadImage")}</Link></Button>
              <Button asChild variant="outline"><Link href={`/${lang}/admin/assets/upload`}>{t("admin.dashboard.uploadModel")}</Link></Button>
              <Button asChild variant="outline"><Link href={`/${lang}/admin/sponsors`}>{t("admin.dashboard.createSponsor")}</Link></Button>
              <Button asChild variant="outline" className="sm:col-span-2">
                <Link href={`/${lang}/admin/metrics`}>{t("admin.dashboard.viewMetrics")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.recentImagesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentImagesQ.error ? <div className="text-sm text-red-600">{t("admin.dashboard.failedInline")}</div> : null}
            {recentImagesQ.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> : null}
            {!recentImagesQ.isLoading && !recentImagesQ.error ? (
              <div className="max-h-96 overflow-auto space-y-2">
                {recentImages.map((img) => (
                  <div key={img.image_id} className="flex items-start gap-3 rounded border p-2">
                    <Image
                      src={getStorageUrl(img.storage_path)}
                      alt={img.name ?? `image-${img.image_id}`}
                      width={64}
                      height={48}
                      className="h-12 w-16 rounded border object-cover shrink-0"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium truncate">{img.name ?? `#${img.image_id}`}</div>
                      <div className="text-xs text-muted-foreground">{t("images.scope")}: {inferImageScope(img.scope, img.storage_path)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(img.created_at)}</div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${lang}/admin/assets/images/${img.image_id}`}>{t("images.open")}</Link>
                    </Button>
                  </div>
                ))}
                {recentImages.length === 0 ? <div className="text-sm text-muted-foreground">{t("admin.dashboard.noData")}</div> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.dashboard.recentModelsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentModelsQ.error ? <div className="text-sm text-red-600">{t("admin.dashboard.failedInline")}</div> : null}
            {recentModelsQ.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> : null}
            {!recentModelsQ.isLoading && !recentModelsQ.error ? (
              <div className="max-h-96 overflow-auto space-y-2">
                {recentModels.map((model) => (
                  <div key={model.model_id} className="rounded border p-2 text-sm space-y-1">
                    <div className="font-medium truncate">{model.name ?? `#${model.model_id}`}</div>
                    <div className="text-xs text-muted-foreground">{t("models.type")}: {model.type}</div>
                    <div className="text-xs text-muted-foreground">{t("admin.dashboard.version")}: {model.version ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{t("admin.dashboard.eventSlug")}: {inferEventSlugFromPath(model.storage_path)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(model.created_at)}</div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${lang}/admin/assets/models/${model.model_id}`}>{t("models.open")}</Link>
                    </Button>
                  </div>
                ))}
                {recentModels.length === 0 ? <div className="text-sm text-muted-foreground">{t("admin.dashboard.noData")}</div> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
