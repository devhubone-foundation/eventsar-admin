// src/app/[lang]/admin/assets/images/[id]/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { qk } from "@/lib/api/keys";
import { deleteImage, getImage, getImageUsage, replaceImageFile, type ImageUsageRecord } from "@/lib/api/images";
import { getStorageUrl } from "@/lib/storage";

function getNumberFromDetails(details: Record<string, unknown> | null | undefined, key: string) {
  const value = details?.[key];
  return typeof value === "number" ? value : null;
}

function getStringFromDetails(details: Record<string, unknown> | null | undefined, key: string) {
  const value = details?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getUsageTypeLabel(record: ImageUsageRecord, t: (key: string) => string) {
  const labels: Record<string, string> = {
    "event.logo": t("images.usage.type.eventLogo"),
    "event.background": t("images.usage.type.eventBackground"),
    "event.watermark": t("images.usage.type.eventWatermark"),
    "experience.thumbnail": t("images.usage.type.experienceThumbnail"),
    "experience.tracking": t("images.usage.type.experienceTracking"),
    "experience.watermark": t("images.usage.type.experienceWatermark"),
    "sponsor.logo": t("images.usage.type.sponsorLogo"),
    "sponsor.watermark": t("images.usage.type.sponsorWatermark"),
    "experience_sponsor.watermark": t("images.usage.type.experienceSponsorWatermark"),
  };

  return labels[record.usage_type] ?? record.usage_type;
}

function getEntityTypeLabel(record: ImageUsageRecord, t: (key: string) => string) {
  const labels: Record<string, string> = {
    event: t("images.usage.entity.event"),
    experience: t("images.usage.entity.experience"),
    sponsor: t("images.usage.entity.sponsor"),
    experience_sponsor: t("images.usage.entity.experienceSponsor"),
  };

  return labels[record.entity_type] ?? record.entity_type;
}

function getUsageTarget(record: ImageUsageRecord, lang: string, t: (key: string) => string) {
  if (record.entity_type === "event") {
    return {
      href: `/${lang}/admin/events/${record.entity_id}`,
      label: t("events.open"),
    };
  }

  if (record.entity_type === "experience") {
    return {
      href: `/${lang}/admin/experiences/${record.entity_id}`,
      label: t("experiences.open"),
    };
  }

  if (record.entity_type === "experience_sponsor") {
    const experienceId = getNumberFromDetails(record.details, "experience_id");
    if (experienceId) {
      return {
        href: `/${lang}/admin/experiences/${experienceId}`,
        label: t("experiences.open"),
      };
    }
  }

  return null;
}

function getUsageMetaLines(record: ImageUsageRecord, t: (key: string) => string) {
  const lines: string[] = [];
  const eventSlug = getStringFromDetails(record.details, "event_slug");
  const experienceSlug = getStringFromDetails(record.details, "experience_slug");
  const experienceId = getNumberFromDetails(record.details, "experience_id");

  if (eventSlug) lines.push(`${t("images.usage.metaEvent")}: ${eventSlug}`);
  if (experienceSlug) lines.push(`${t("images.usage.metaExperience")}: ${experienceSlug}`);
  if (record.entity_type === "experience_sponsor" && experienceId) {
    lines.push(`${t("images.usage.metaExperienceId")}: ${experienceId}`);
  }

  return lines;
}

export default function ImageDetailPage() {
  const { lang, t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.image(id),
    queryFn: () => getImage(id),
  });

  const usageQuery = useQuery({
    queryKey: ["imageUsage", String(id)],
    queryFn: () => getImageUsage(id),
    enabled: Boolean(id),
  });

  const del = useMutation({
    mutationFn: () => deleteImage(id),
    onSuccess: async () => {
      toast.success(t("images.deleted"));
      await qc.invalidateQueries({ queryKey: qk.images(undefined) });
      router.replace(`/${lang}/admin/assets/images`);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("images.deleteFailed"));
    },
  });

  const replace = useMutation({
    mutationFn: async () => {
      if (!replacementFile) throw new Error(t("images.replaceNeedFile"));
      return replaceImageFile(id, replacementFile);
    },
    onSuccess: async () => {
      setReplacementFile(null);
      toast.success(t("images.replaced"));
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.image(id) }),
        qc.invalidateQueries({ queryKey: qk.images(undefined) }),
        qc.invalidateQueries({ queryKey: ["imageUsage", String(id)] }),
      ]);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("images.replaceFailed"));
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return <div className="text-sm text-red-600">{t("images.loadFailed")}</div>;

  const storagePath = data.storage_path as string;
  const name = (data.name as string | null) ?? null;
  const imageUrl = getStorageUrl(storagePath);
  const usageItems = usageQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" onClick={() => router.push(`/${lang}/admin/assets/images`)}>
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{name ?? `Image #${id}`}</h1>
            <div className="break-all text-xs text-muted-foreground">{storagePath}</div>
          </div>
        </div>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          {t("images.delete")}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="block w-full rounded border bg-muted/20 p-2 text-left transition-colors hover:bg-muted/40"
        aria-label="Open large image preview"
      >
        <div className="relative flex h-[280px] w-full items-center justify-center overflow-hidden rounded bg-background sm:h-[360px]">
          <Image src={imageUrl} alt={name ?? `image ${id}`} fill className="object-contain" unoptimized />
        </div>
      </button>

      <div className="space-y-1 rounded border p-4 text-sm">
        <div>
          <span className="text-muted-foreground">image_id:</span> {data.image_id}
        </div>
        <div>
          <span className="text-muted-foreground">mime_type:</span> {data.mime_type ?? "-"}
        </div>
        <div>
          <span className="text-muted-foreground">width:</span> {data.width ?? "-"}
        </div>
        <div>
          <span className="text-muted-foreground">height:</span> {data.height ?? "-"}
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
          <CardTitle>{t("images.replaceTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("images.replaceDesc")}</p>

          <FileDropzone
            accept="image/png,image/jpeg,image/webp,image/*"
            file={replacementFile}
            onFile={setReplacementFile}
            labelKey="upload.file"
          />

          <div className="flex justify-end">
            <Button type="button" onClick={() => replace.mutate()} disabled={replace.isPending || !replacementFile}>
              {replace.isPending ? t("upload.uploading") : t("images.replaceAction")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("images.usage.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("images.usage.description")}</p>

          {usageQuery.isLoading ? <div className="text-sm text-muted-foreground">{t("common.loading")}</div> : null}
          {usageQuery.error ? <div className="text-sm text-red-600">{t("images.usage.loadFailed")}</div> : null}

          {!usageQuery.isLoading && !usageQuery.error && usageItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("images.usage.empty")}</div>
          ) : null}

          {!usageQuery.isLoading && !usageQuery.error && usageItems.length > 0 ? (
            <div className="space-y-2">
              {usageItems.map((record, index) => {
                const target = getUsageTarget(record, lang, t);
                const metaLines = getUsageMetaLines(record, t);
                const title = typeof record.name === "string" && record.name.trim() ? record.name : `#${record.entity_id}`;

                return (
                  <div
                    key={`${record.usage_type}:${record.entity_type}:${record.entity_id}:${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
                          {getUsageTypeLabel(record, t)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getEntityTypeLabel(record, t)} #{record.entity_id}
                        </span>
                      </div>

                      <div className="font-medium">{title}</div>

                      {metaLines.length > 0 ? (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {metaLines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      ) : null}

                      {record.details ? (
                        <div className="text-xs text-muted-foreground">
                          {t("images.usage.metaDetails")}: {JSON.stringify(record.details)}
                        </div>
                      ) : null}
                    </div>

                    {target ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={target.href}>{target.label}</Link>
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("images.confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>{t("images.confirmDeleteDesc")}</DialogDescription>
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
        <DialogContent size="5xl" className="p-2 sm:p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>{name ?? `Image #${id}`} preview</DialogTitle>
          </DialogHeader>
          <div className="relative flex h-[70vh] w-full items-center justify-center overflow-hidden rounded bg-background">
            <Image src={imageUrl} alt={name ?? `image ${id}`} fill className="object-contain" unoptimized />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
