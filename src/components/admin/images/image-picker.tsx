// src/components/admin/images/image-picker.tsx
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import { listImages, type ImageListQuery, updateImageMetadata } from "@/lib/api/images";
import { getStorageUrl } from "@/lib/storage";
import { getImageDimensions } from "@/lib/image/get-image-dimensions";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { FileDropzone } from "@/components/admin/file-dropzone";

import { useMetaEnums } from "@/lib/meta/use-meta";

type Scope = "ALL" | "EVENT" | "SPONSOR" | "GLOBAL";

export type ImagePickerValue = {
  image_id: number;
  storage_path: string;
  name: string | null;
  mime_type: string | null;
  scope?: "EVENT" | "SPONSOR" | "GLOBAL";
} | null;

export function ImagePicker({
                              value,
                              onChange,
                              allowedScopes = ["EVENT", "SPONSOR", "GLOBAL"],
                              eventSlug, // needed if uploading with EVENT scope
                              labelKey = "picker.selectImage",
                            }: {
  value: ImagePickerValue;
  onChange: (v: ImagePickerValue) => void;
  allowedScopes?: Array<"EVENT" | "SPONSOR" | "GLOBAL">;
  eventSlug?: string;
  labelKey?: string;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("ALL");

  const meta = useMetaEnums();
  const imageScopes = meta.enums.Image_Scope ?? ["EVENT", "SPONSOR", "GLOBAL"];

  // inline upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadScope, setUploadScope] = useState<"EVENT" | "SPONSOR" | "GLOBAL">(allowedScopes[0] ?? "GLOBAL");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");

  const query: ImageListQuery = useMemo(
    () => ({
      page: 1,
      pageSize: 60,
      q: q || undefined,
      mime_prefix: "image/",
      scope: scope === "ALL" ? undefined : (scope as any),
      sortBy: "created_at",
      sortDir: "desc",
    }),
    [q, scope]
  );

  const imagesQ = useQuery({
    queryKey: qk.images({ picker: true, ...query }),
    queryFn: async () => {
      const res = await listImages(query);

      // Best-effort client-side scope filter if backend doesn’t filter or doesn’t return scope
      if (scope !== "ALL") {
        const target = scope;
        const filtered = res.items.filter((it) => {
          if (it.scope) return it.scope === target;
          // fallback heuristic based on storage_path prefix
          if (target === "SPONSOR") return it.storage_path.startsWith("sponsors/");
          if (target === "EVENT") return it.storage_path.startsWith("events/");
          if (target === "GLOBAL") return it.storage_path.startsWith("global/");
          return true;
        });
        return { ...res, items: filtered, total: filtered.length, page: 1, pageSize: 60 };
      }

      return res;
    },
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t("toast.uploadFailed"));
      if (uploadScope === "EVENT" && (!eventSlug || !eventSlug.trim())) {
        throw new Error(t("upload.needEventSlug"));
      }
      const dimensions = await getImageDimensions(file);

      const fd = new FormData();
      fd.append("scope", uploadScope);
      if (uploadScope === "EVENT") fd.append("eventSlug", eventSlug!);
      if (name) fd.append("name", name);
      fd.append("file", file);

      const res = await fetch("/api/admin/upload/image", { method: "POST", body: fd, credentials: "include" });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      const created = data as { image_id: number; storage_path: string };
      await updateImageMetadata(created.image_id, {
        width: dimensions.width,
        height: dimensions.height,
      });
      return created;
    },
    onSuccess: async (created) => {
      toast.success(t("toast.uploadImageOk"));
      setUploadOpen(false);
      setFile(null);
      setName("");

      // refresh list
      await qc.invalidateQueries({ queryKey: qk.images({ picker: true }) });

      // auto-select created image
      onChange({
        image_id: created.image_id,
        storage_path: created.storage_path,
        name: name || null,
        mime_type: null,
        scope: uploadScope,
      });

      setOpen(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("toast.uploadFailed"));
    },
  });

  // Build scope options from meta enums, constrained by allowedScopes
  const scopeOptions: Scope[] = useMemo(() => {
    const opts: Scope[] = ["ALL"];
    const allowedSet = new Set(allowedScopes);
    for (const s of imageScopes) {
      if (allowedSet.has(s as any)) opts.push(s as any);
    }
    return opts;
  }, [allowedScopes, imageScopes]);

  // Upload scope options (no hardcoded enum list)
  const uploadScopeOptions = useMemo(() => {
    const allowedSet = new Set(allowedScopes);
    return imageScopes.filter((s) => allowedSet.has(s as any)) as Array<"EVENT" | "SPONSOR" | "GLOBAL">;
  }, [allowedScopes, imageScopes]);

  const selectedLabel = value ? `${value.name ?? `#${value.image_id}`}` : t("picker.none");

  function scopePill(s?: "EVENT" | "SPONSOR" | "GLOBAL") {
    if (!s) return null;
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/40">
        {meta.enumLabel("Image_Scope", s)}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t(labelKey)}</div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 rounded border p-2 min-w-[280px]">
          {value ? (
            <img
              src={getStorageUrl(value.storage_path)}
              alt={value.name ?? "selected"}
              className="h-10 w-14 object-cover rounded border"
            />
          ) : (
            <div className="h-10 w-14 rounded border bg-muted" />
          )}

          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{selectedLabel}</div>
            <div className="text-xs text-muted-foreground truncate">{value?.storage_path ?? ""}</div>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {t("picker.select")}
        </Button>

        <Button type="button" variant="ghost" onClick={() => onChange(null)} disabled={!value}>
          {t("picker.clear")}
        </Button>
      </div>

      {/* Main picker modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-none" size="5xl">
          <DialogHeader>
            <DialogTitle>{t("picker.selectImage")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            {/* left */}
            <div className="space-y-3 min-w-0">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1 flex-1 min-w-[260px]">
                  <Label>{t("images.search")}</Label>
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("picker.searchPlaceholder")}
                  />
                </div>

                <div className="space-y-1 w-[220px]">
                  <Label>{t("images.scope")}</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "ALL" ? t("picker.scopeAll") : meta.enumLabel("Image_Scope", s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {imagesQ.isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
              {imagesQ.error && <div className="text-sm text-red-600">{t("images.loadFailed")}</div>}

              {/* results (scroll) */}
              <div className="rounded border overflow-hidden">
                <div className="max-h-[65vh] overflow-y-auto">
                  {imagesQ.data?.items?.length ? (
                    <div className="divide-y">
                      {imagesQ.data.items.map((it) => (
                        <button
                          key={it.image_id}
                          type="button"
                          className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            onChange({
                              image_id: it.image_id,
                              storage_path: it.storage_path,
                              name: it.name,
                              mime_type: it.mime_type,
                              scope: it.scope,
                            });
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={getStorageUrl(it.storage_path)}
                              alt={it.name ?? `image ${it.image_id}`}
                              className="h-12 w-20 object-cover rounded border shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {it.name ?? `#${it.image_id}`}
                                </div>
                                {scopePill(it.scope)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{it.storage_path}</div>
                              <div className="text-xs text-muted-foreground">
                                {it.mime_type ?? "—"}
                              </div>
                            </div>

                            <div className="shrink-0">
                              <span className="text-xs text-muted-foreground">
                                #{it.image_id}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">{t("picker.none")}</div>
                  )}
                </div>
              </div>
            </div>

            {/* right */}
            <div className="space-y-3">
              <Button type="button" className="w-full" onClick={() => setUploadOpen(true)}>
                {t("picker.uploadNew")}
              </Button>

              <div className="rounded border p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">{t("picker.selected")}</div>
                <div className="break-all">{value?.storage_path ?? t("picker.none")}</div>
              </div>

              {value?.storage_path && (
                <div className="rounded border p-3">
                  <img
                    src={getStorageUrl(value.storage_path)}
                    alt={value.name ?? "selected"}
                    className="w-full h-auto rounded border"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("picker.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline upload modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-none" size="xl">
          <DialogHeader>
            <DialogTitle>{t("upload.inlineTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("upload.scope")}</Label>
              <Select value={uploadScope} onValueChange={(v) => setUploadScope(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uploadScopeOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {meta.enumLabel("Image_Scope", s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {uploadScope === "EVENT" && !eventSlug && (
                <p className="text-xs text-red-600">{t("upload.needEventSlug")}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>{t("upload.nameOptional")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <FileDropzone accept="image/*" file={file} onFile={setFile} labelKey="upload.file" />

            <Button
              type="button"
              className="w-full"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || (uploadScope === "EVENT" && !eventSlug)}
            >
              {uploadMutation.isPending ? t("upload.uploading") : t("upload.inlineSubmit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
