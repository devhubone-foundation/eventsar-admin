"use client";

import Link from "next/link";
import { createElement, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FileDropzone } from "@/components/admin/file-dropzone";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listEvents } from "@/lib/api/events";
import { listEventExperiences } from "@/lib/api/experiences";
import { qk } from "@/lib/api/keys";
import { deleteModel, getModel, replaceModelFile } from "@/lib/api/models";
import { getStorageUrl } from "@/lib/storage";

type EventRow = {
  id: string;
  slug: string;
};

type ExperienceRow = {
  experience_id: number;
  slug: string;
  status: string;
  type: string;
  localizations?: Array<{ language: "EN" | "BG"; display_name: string }>;
};

type ModelViewerElement = HTMLElement & {
  autoplay: boolean;
  loop: boolean;
  play: () => void;
};

function pickFromRecord(raw: unknown, key: string): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as Record<string, unknown>)[key];
}

function normalizeEventRows(rawItems: unknown[]): EventRow[] {
  return rawItems
    .map((item) => {
      const id = pickFromRecord(item, "event_id") ?? pickFromRecord(item, "id");
      const slug = pickFromRecord(item, "slug");
      if ((typeof id !== "string" && typeof id !== "number") || typeof slug !== "string") return null;

      return {
        id: String(id),
        slug,
      };
    })
    .filter((item): item is EventRow => Boolean(item));
}

function getExperienceName(row: ExperienceRow, lang: string) {
  const uiLang = lang.toUpperCase() === "BG" ? "BG" : "EN";
  const localized = row.localizations?.find((item) => item.language === uiLang)?.display_name;
  const fallback = row.localizations?.find((item) => item.language === "EN")?.display_name;
  return localized ?? fallback ?? row.slug;
}

export default function ModelDetailPage() {
  const { lang, t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const modelViewerRef = useRef<ModelViewerElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.model(id),
    queryFn: () => getModel(id),
  });

  const modelUrl = data?.storage_path ? getStorageUrl(data.storage_path) : "";

  const eventsQuery = useQuery({
    queryKey: qk.events({ page: 1, pageSize: 200, sortBy: "created_at", sortDir: "desc" }),
    queryFn: () => listEvents({ page: 1, pageSize: 200, sortBy: "created_at", sortDir: "desc" }),
  });

  const events = normalizeEventRows(eventsQuery.data?.items ?? []);

  const experienceQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: qk.experiences(event.id, {
        page: 1,
        pageSize: 100,
        model_id: id,
        sortBy: "sort_order",
        sortDir: "asc",
      }),
      queryFn: () =>
        listEventExperiences(event.id, {
          page: 1,
          pageSize: 100,
          model_id: id,
          sortBy: "sort_order",
          sortDir: "asc",
        }),
      enabled: Boolean(id),
    })),
  });

  const del = useMutation({
    mutationFn: () => deleteModel(id),
    onSuccess: async () => {
      toast.success(t("models.deleted"));
      await qc.invalidateQueries({ queryKey: qk.models(undefined) });
      router.replace(`/${lang}/admin/assets/models`);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("models.deleteFailed"));
    },
  });

  const replace = useMutation({
    mutationFn: async () => {
      if (!replacementFile) throw new Error(t("models.replaceNeedFile"));
      return replaceModelFile(id, replacementFile);
    },
    onSuccess: async () => {
      setReplacementFile(null);
      setPreviewReady(false);
      toast.success(t("models.replaced"));
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.model(id) }),
        qc.invalidateQueries({ queryKey: qk.models(undefined) }),
      ]);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("models.replaceFailed"));
    },
  });

  useEffect(() => {
    if (!previewOpen) return;

    let cancelled = false;
    setPreviewReady(false);
    setPreviewError(null);

    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setPreviewReady(true);
      })
      .catch(() => {
        if (!cancelled) setPreviewError(t("models.preview.loadFailed"));
      });

    return () => {
      cancelled = true;
    };
  }, [previewOpen, t]);

  useEffect(() => {
    if (!previewOpen || !previewReady) return;

    const viewer = modelViewerRef.current;
    if (!viewer) return;

    let cancelled = false;

    const startAnimation = () => {
      if (cancelled) return;
      viewer.autoplay = true;
      viewer.loop = true;

      requestAnimationFrame(() => {
        if (!cancelled) viewer.play();
      });
    };

    viewer.addEventListener("load", startAnimation);
    startAnimation();

    return () => {
      cancelled = true;
      viewer.removeEventListener("load", startAnimation);
    };
  }, [previewOpen, previewReady, modelUrl]);

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return <div className="text-sm text-red-600">{t("models.loadFailed")}</div>;

  const name = data.name ?? null;

  const usageGroups = events
    .map((event, index) => ({
      event,
      items: (experienceQueries[index]?.data?.items ?? []) as ExperienceRow[],
    }))
    .filter((group) => group.items.length > 0);

  const usageIsLoading = eventsQuery.isLoading || experienceQueries.some((query) => query.isLoading);
  const usageHasError = Boolean(eventsQuery.error) || experienceQueries.some((query) => query.error);
  const totalUsageCount = usageGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{name ?? `Model #${id}`}</h1>
          <div className="break-all text-xs text-muted-foreground">{String(data.storage_path ?? "")}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            {t("models.preview.action")}
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            {t("models.delete")}
          </Button>
        </div>
      </div>

      <div className="space-y-1 rounded border p-4 text-sm">
        <div>
          <span className="text-muted-foreground">model_id:</span> {data.model_id}
        </div>
        <div>
          <span className="text-muted-foreground">type:</span> {data.type ?? "-"}
        </div>
        <div>
          <span className="text-muted-foreground">version:</span> {data.version ?? "-"}
        </div>
        <div>
          <span className="text-muted-foreground">file_size_bytes:</span> {data.file_size_bytes ?? "-"}
        </div>
        <div>
          <span className="text-muted-foreground">created_at:</span> {data.created_at ?? "-"}
        </div>
        <div>
          <span className="text-muted-foreground">updated_at:</span> {data.updated_at ?? "-"}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("models.replaceTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("models.replaceDesc")}</p>

          <FileDropzone
            accept=".glb,model/gltf-binary"
            file={replacementFile}
            onFile={setReplacementFile}
            labelKey="upload.glbFile"
          />

          <div className="flex justify-end">
            <Button type="button" onClick={() => replace.mutate()} disabled={replace.isPending || !replacementFile}>
              {replace.isPending ? t("upload.uploading") : t("models.replaceAction")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("models.usage.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("models.usage.description")}</p>

          {usageIsLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> : null}
          {usageHasError ? <div className="text-sm text-red-600">{t("models.usage.loadFailed")}</div> : null}

          {!usageIsLoading && !usageHasError && totalUsageCount === 0 ? (
            <div className="text-sm text-muted-foreground">{t("models.usage.empty")}</div>
          ) : null}

          {!usageIsLoading && !usageHasError && usageGroups.length > 0 ? (
            <div className="space-y-3">
              {usageGroups.map(({ event, items }) => (
                <div key={event.id} className="rounded-lg border bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("models.usage.eventLabel")}
                      </div>
                      <div className="font-medium">{event.slug}</div>
                      <div className="text-xs text-muted-foreground">
                        #{event.id} - {t("models.usage.experiencesLabel")}: {items.length}
                      </div>
                    </div>

                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${lang}/admin/events/${event.id}`}>{t("events.open")}</Link>
                    </Button>
                  </div>

                  <div className="space-y-2 p-3">
                    {items.map((experience) => (
                      <div
                        key={experience.experience_id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 text-sm shadow-sm"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("models.usage.experienceLabel")}
                          </div>
                          <div className="truncate font-medium">{getExperienceName(experience, lang)}</div>
                          <div className="text-xs text-muted-foreground">
                            #{experience.experience_id} - {experience.slug} - {experience.type} - {experience.status}
                          </div>
                        </div>

                        <Button asChild size="sm" variant="outline">
                          <Link href={`/${lang}/admin/experiences/${experience.experience_id}`}>
                            {t("experiences.open")}
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("models.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>{t("models.confirmDeleteDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("images.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => del.mutate()} disabled={del.isPending}>
              {del.isPending ? t("common.loading") : t("images.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("models.preview.title")}</DialogTitle>
            <DialogDescription>{t("models.preview.help")}</DialogDescription>
          </DialogHeader>

          <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {t("models.preview.warning")}
          </p>

          <div className="overflow-hidden rounded border bg-muted/30">
            {previewError ? (
              <div className="flex h-[70vh] items-center justify-center p-6 text-sm text-red-600">{previewError}</div>
            ) : previewReady ? (
              createElement("model-viewer", {
                key: `${data.model_id}-${data.updated_at ?? data.storage_path}`,
                ref: modelViewerRef,
                src: modelUrl,
                alt: name ?? `Model #${id}`,
                style: { width: "100%", height: "70vh", background: "transparent" },
                autoplay: true,
                loop: true,
                "camera-controls": "",
                "touch-action": "pan-y",
                "shadow-intensity": "1",
                exposure: "1",
                "environment-image": "neutral",
                "interaction-prompt": "none",
              })
            ) : (
              <div className="flex h-[70vh] items-center justify-center p-6 text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
