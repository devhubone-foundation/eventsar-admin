// src/components/admin/upload-model-form.tsx
"use client";

import { useState } from "react";
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
import { useI18n } from "@/components/i18n-provider";

const schema = z.object({
  eventSlug: z.string().min(1, "eventSlug is required"),
  type: z.enum(["WORLD_AR", "FACE", "IMAGE_TRACKING"]),
  name: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function UploadModelForm() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ model_id: number; storage_path: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { eventSlug: "", type: "WORLD_AR", name: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!file) throw new Error(t("toast.uploadFailed"));

      const fd = new FormData();
      fd.append("eventSlug", values.eventSlug);
      fd.append("type", values.type);
      if (values.name) fd.append("name", values.name);
      fd.append("file", file);

      const res = await fetch("/api/admin/upload/model", {
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

      return data as { model_id: number; storage_path: string };
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(t("toast.uploadModelOk"));
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("toast.uploadFailed"));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("upload.modelTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="space-y-1">
            <Label htmlFor="eventSlug">{t("upload.eventSlug")}</Label>
            <Input id="eventSlug" {...form.register("eventSlug")} placeholder="sofia-tech-expo-2026" />
            {form.formState.errors.eventSlug && (
              <p className="text-sm text-red-600">{form.formState.errors.eventSlug.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={form.getValues("type")} onValueChange={(v) => form.setValue("type", v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORLD_AR">WORLD_AR</SelectItem>
                <SelectItem value="FACE">FACE</SelectItem>
                <SelectItem value="IMAGE_TRACKING">IMAGE_TRACKING</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">{t("upload.nameOptional")}</Label>
            <Input id="name" {...form.register("name")} placeholder="Robot Detective v1" />
          </div>

          <FileDropzone accept=".glb,model/gltf-binary" file={file} onFile={setFile} labelKey="upload.glbFile" />

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t("upload.uploading") : t("upload.uploadModel")}
          </Button>
        </form>

        {result && (
          <div className="rounded border p-3 space-y-2">
            <div className="text-sm font-medium">{t("upload.result")}</div>
            <div className="text-sm">model_id: {result.model_id}</div>
            <div className="text-xs text-muted-foreground break-all">{result.storage_path}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
