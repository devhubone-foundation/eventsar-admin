// src/components/admin/upload-image-form.tsx
"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FileDropzone } from "@/components/admin/file-dropzone";
import { ImageThumb } from "@/components/admin/image-thumb";
import { useI18n } from "@/components/i18n-provider";
import { useMetaEnums } from "@/lib/meta/use-meta";
import { getImageDimensions } from "@/lib/image/get-image-dimensions";
import { updateImageMetadata } from "@/lib/api/images";

const schema = z.object({
  scope: z.enum(["EVENT", "SPONSOR", "GLOBAL"]),
  eventSlug: z.string().optional(),
  name: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function UploadImageForm() {
  const { t } = useI18n();
  const meta = useMetaEnums();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ image_id: number; storage_path: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(
      schema.superRefine((v, ctx) => {
        if (v.scope === "EVENT" && (!v.eventSlug || v.eventSlug.trim().length === 0)) {
          ctx.addIssue({ code: "custom", path: ["eventSlug"], message: t("upload.needEventSlug") });
        }
      })
    ),
    defaultValues: { scope: "EVENT", eventSlug: "", name: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!file) throw new Error(t("toast.uploadFailed"));
      const dimensions = await getImageDimensions(file);

      const fd = new FormData();
      fd.append("scope", values.scope);
      if (values.scope === "EVENT") fd.append("eventSlug", values.eventSlug ?? "");
      if (values.name) fd.append("name", values.name);
      fd.append("file", file);

      const res = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      }

      const created = data as { image_id: number; storage_path: string };
      await updateImageMetadata(created.image_id, {
        width: dimensions.width,
        height: dimensions.height,
      });

      return created;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(t("toast.uploadImageOk"));
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("toast.uploadFailed"));
    },
  });

  const scope = form.watch("scope");
  const showEventSlug = useMemo(() => scope === "EVENT", [scope]);

  // IMPORTANT: meta says Image_Scope includes SPONSOR; fallback list ensures SPONSOR never disappears.
  const scopeOptions = (meta.enums.Image_Scope ?? ["EVENT", "SPONSOR", "GLOBAL"]).filter(
    (x) => typeof x === "string" && x.trim().length > 0
  ) as Array<"EVENT" | "SPONSOR" | "GLOBAL">;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("upload.imageTitle")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="space-y-1">
            <Label>{t("upload.scope")}</Label>
            <Select value={form.watch("scope")} onValueChange={(v) => form.setValue("scope", v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t("upload.scope")} />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {meta.enumLabel("Image_Scope", s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showEventSlug && (
            <div className="space-y-1">
              <Label htmlFor="eventSlug">{t("upload.eventSlug")}</Label>
              <Input id="eventSlug" {...form.register("eventSlug")} placeholder="sofia-tech-expo-2026" />
              {form.formState.errors.eventSlug && (
                <p className="text-sm text-red-600">{String(form.formState.errors.eventSlug.message)}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">{t("upload.nameOptional")}</Label>
            <Input id="name" {...form.register("name")} placeholder="Tracking marker image" />
          </div>

          <FileDropzone accept="image/*" file={file} onFile={setFile} labelKey="upload.file" />

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t("upload.uploading") : t("upload.uploadImage")}
          </Button>
        </form>

        {result && (
          <div className="rounded border p-3 space-y-2">
            <div className="text-sm font-medium">{t("upload.result")}</div>
            <div className="text-sm">image_id: {result.image_id}</div>
            <ImageThumb storage_path={result.storage_path} alt="Uploaded image" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
