// src/app/[lang]/admin/assets/images/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import { deleteImage, getImage } from "@/lib/api/images";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { ImageThumb } from "@/components/admin/image-thumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function ImageDetailPage() {
  const { lang, t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return <div className="text-sm text-red-600">{t("images.loadFailed")}</div>;

  // try to infer fields; adjust later when we type it
  const storage_path = data.storage_path as string;
  const name = (data.name as string | null) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">{name ?? `Image #${id}`}</h1>
          <div className="text-xs text-muted-foreground break-all">{storage_path}</div>
        </div>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          {t("images.delete")}
        </Button>
      </div>

      <ImageThumb storage_path={storage_path} alt={name ?? `image ${id}`} />

      <div className="rounded border p-4 text-sm space-y-1">
        <div><span className="text-muted-foreground">image_id:</span> {data.image_id}</div>
        <div><span className="text-muted-foreground">mime_type:</span> {data.mime_type ?? "—"}</div>
        <div><span className="text-muted-foreground">width:</span> {data.width ?? "—"}</div>
        <div><span className="text-muted-foreground">height:</span> {data.height ?? "—"}</div>
        <div><span className="text-muted-foreground">created_at:</span> {data.created_at ?? "—"}</div>
      </div>

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
            <Button
              variant="destructive"
              onClick={() => del.mutate()}
              disabled={del.isPending}
            >
              {del.isPending ? t("common.loading") : t("images.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
