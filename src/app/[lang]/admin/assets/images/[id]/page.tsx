// src/app/[lang]/admin/assets/images/[id]/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
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
import { deleteImage, getImage, replaceImageFile } from "@/lib/api/images";
import { getStorageUrl } from "@/lib/storage";

export default function ImageDetailPage() {
  const { lang, t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const isBg = lang === "bg";
  const replaceTitle = isBg ? "Смени файла на изображението" : "Replace image file";
  const replaceDesc = isBg
    ? "Качете нов файл за това image ID. Записът се запазва, а прегледът ще се обнови след успешно качване."
    : "Upload a new file for this image ID. The existing record stays the same and the preview will refresh after upload.";
  const replaceAction = isBg ? "Смени изображение" : "Replace image";
  const replaceNeedFile = isBg ? "Изберете файл с изображение" : "Choose an image file first";
  const replaceOk = isBg ? "Файлът на изображението е сменен" : "Image file replaced";
  const replaceFailed = isBg ? "Неуспешна смяна на файла на изображението" : "Failed to replace image file";

  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.image(id),
    queryFn: () => getImage(id),
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
      if (!replacementFile) throw new Error(replaceNeedFile);
      return replaceImageFile(id, replacementFile);
    },
    onSuccess: async () => {
      setReplacementFile(null);
      toast.success(replaceOk);
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.image(id) }),
        qc.invalidateQueries({ queryKey: qk.images(undefined) }),
      ]);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : replaceFailed);
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return <div className="text-sm text-red-600">{t("images.loadFailed")}</div>;

  const storage_path = data.storage_path as string;
  const name = (data.name as string | null) ?? null;
  const imageUrl = getStorageUrl(storage_path);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" onClick={() => router.push(`/${lang}/admin/assets/images`)}>
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{name ?? `Image #${id}`}</h1>
            <div className="break-all text-xs text-muted-foreground">{storage_path}</div>
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
          <CardTitle>{replaceTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{replaceDesc}</p>

          <FileDropzone
            accept="image/png,image/jpeg,image/webp,image/*"
            file={replacementFile}
            onFile={setReplacementFile}
            labelKey="upload.file"
          />

          <div className="flex justify-end">
            <Button type="button" onClick={() => replace.mutate()} disabled={replace.isPending || !replacementFile}>
              {replace.isPending ? t("upload.uploading") : replaceAction}
            </Button>
          </div>
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
