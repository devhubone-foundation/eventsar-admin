"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { useMetaEnums } from "@/lib/meta/use-meta";
import { useI18n } from "@/components/i18n-provider";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

async function uploadModel(formData: FormData) {
  // direct call to proxy route
  const res = await fetch("/api/admin/upload/model", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.message ?? `UPLOAD_FAILED_STATUS:${res.status}`);
  }
  return data;
}

export function UploadModelModal({
                                   open,
                                   onOpenChange,
                                   defaultEventSlug,
                                   onUploaded,
                                 }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultEventSlug: string;
  onUploaded: (modelId: number) => void;
}) {
  const { t } = useI18n();
  const meta = useMetaEnums();
  const types = meta.enums.Model_Type ?? [];

  const [eventSlug, setEventSlug] = useState(defaultEventSlug);
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      if (!eventSlug.trim()) throw new Error(t("upload.modelModal.eventSlugRequired"));
      if (!type) throw new Error(t("upload.modelModal.typeRequired"));
      if (!file) throw new Error(t("upload.modelModal.fileRequired"));

      const fd = new FormData();
      fd.set("eventSlug", eventSlug.trim());
      fd.set("type", type);
      fd.set("name", name.trim() || "Model");
      fd.set("file", file);
      return uploadModel(fd);
    },
    onSuccess: (data) => {
      const modelId = data?.model_id;
      if (!modelId) {
        toast.error(t("upload.modelModal.uploadedMissingModelId"));
        return;
      }
      toast.success(t("upload.modelModal.uploaded"));
      onUploaded(Number(modelId));
    },
    onError: (e) => {
      if (e instanceof Error && e.message.startsWith("UPLOAD_FAILED_STATUS:")) {
        const status = e.message.replace("UPLOAD_FAILED_STATUS:", "");
        toast.error(`${t("upload.modelModal.uploadFailedStatusPrefix")}${status})`);
        return;
      }
      toast.error(e instanceof Error ? e.message : t("toast.uploadFailed"));
    },
  });

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("upload.modelTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t("upload.eventSlug")}</Label>
            <Input value={eventSlug} onChange={(e) => setEventSlug(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>{t("models.type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder={t("upload.modelModal.selectType")} /></SelectTrigger>
              <SelectContent>
                {types.map((x) => (
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t("upload.nameOptional")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("upload.modelModal.namePlaceholder")} />
          </div>

          <div
            className="rounded border p-4 text-sm text-muted-foreground"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">{t("upload.modelModal.dropTitle")}</div>
                <div className="text-xs">{t("upload.modelModal.dropHint")}</div>
              </div>
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                {t("dropzone.chooseFile")}
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".glb,model/gltf-binary"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {file && <div className="mt-3 text-xs">{t("dropzone.selected")}: {file.name}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? t("upload.uploading") : t("upload.uploadModel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
