// src/app/[lang]/admin/assets/models/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

import { qk } from "@/lib/api/keys";
import { deleteModel, getModel } from "@/lib/api/models";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ModelDetailPage() {
  const { lang, t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: qk.model(id),
    queryFn: () => getModel(id),
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

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!data) return <div className="text-sm text-red-600">{t("models.loadFailed")}</div>;

  const name = (data.name as string | null) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">{name ?? `Model #${id}`}</h1>
          <div className="text-xs text-muted-foreground break-all">{String(data.storage_path ?? "")}</div>
        </div>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          {t("models.delete")}
        </Button>
      </div>

      <div className="rounded border p-4 text-sm space-y-1">
        <div><span className="text-muted-foreground">model_id:</span> {data.model_id}</div>
        <div><span className="text-muted-foreground">type:</span> {data.type ?? "—"}</div>
        <div><span className="text-muted-foreground">version:</span> {data.version ?? "—"}</div>
        <div><span className="text-muted-foreground">file_size_bytes:</span> {data.file_size_bytes ?? "—"}</div>
        <div><span className="text-muted-foreground">created_at:</span> {data.created_at ?? "—"}</div>
      </div>

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
    </div>
  );
}
