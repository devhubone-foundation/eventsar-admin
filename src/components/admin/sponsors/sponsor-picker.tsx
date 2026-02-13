// src/components/admin/sponsors/sponsor-picker.tsx
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { qk } from "@/lib/api/keys";
import { createSponsor, listSponsors } from "@/lib/api/sponsors";
import { getStorageUrl } from "@/lib/storage";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { WatermarkEditor, type WatermarkValue } from "@/components/admin/watermark/watermark-editor";

export type SponsorPickerValue =
  | {
  sponsor_id: number;
  name: string;
  logo_storage_path?: string | null;
}
  | null;

function pickId(raw: any): number | null {
  return typeof raw?.sponsor_id === "number"
    ? raw.sponsor_id
    : typeof raw?.id === "number"
      ? raw.id
      : null;
}

function pickName(raw: any): string {
  return String(raw?.name ?? "");
}

function pickLogoPath(raw: any): string | null {
  // best effort: backend may return logo_image.storage_path or logo.storage_path
  return (
    raw?.logo_image?.storage_path ??
    raw?.logo?.storage_path ??
    raw?.logo_storage_path ??
    null
  );
}

export function SponsorPicker({
                                value,
                                onChange,
                                labelKey = "sponsorPicker.selectSponsor",
                              }: {
  value: SponsorPickerValue;
  onChange: (v: SponsorPickerValue) => void;
  labelKey?: string;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  const [logo, setLogo] = useState<ImagePickerValue>(null);

  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkValue>({
    position: "bottom_right",
    scale: 1,
    opacity: 1,
  });

  const sponsorsQ = useQuery({
    queryKey: qk.sponsors({ q }),
    queryFn: async () => listSponsors({ page: 1, pageSize: 30, q: q || undefined }),
    enabled: open,
  });

  const items: any[] = useMemo(() => {
    const d = sponsorsQ.data;
    if (!d) return [];
    // tolerant: could be {items: []} or [] directly
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  }, [sponsorsQ.data]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (!logo?.image_id) throw new Error("Logo is required");

      const payload: any = {
        name: name.trim(),
        website_url: website.trim() || undefined,
        logo_image_id: logo.image_id,
      };

      if (watermarkEnabled) {
        // only include watermark if at least image_id is set
        if (watermark.image_id) {
          payload.watermark = {
            image_id: watermark.image_id,
            position: watermark.position,
            scale: watermark.scale,
            opacity: watermark.opacity,
          };
        }
      }

      return createSponsor(payload);
    },
    onSuccess: async (created) => {
      toast.success(t("sponsorCreate.created"));
      await qc.invalidateQueries({ queryKey: qk.sponsors(undefined) });

      const id = pickId(created);
      if (id) {
        onChange({
          sponsor_id: id,
          name: pickName(created),
          logo_storage_path: pickLogoPath(created),
        });
      }

      // close + reset
      setCreateOpen(false);
      setOpen(false);
      setName("");
      setWebsite("");
      setLogo(null);
      setWatermarkEnabled(false);
      setWatermark({ position: "bottom_right", scale: 1, opacity: 1 });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("sponsorCreate.failed"));
    },
  });

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t(labelKey)}</div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 rounded border p-2 min-w-[280px]">
          {value?.logo_storage_path ? (
            <img
              src={getStorageUrl(value.logo_storage_path)}
              alt={value.name}
              className="h-10 w-10 object-cover rounded border"
            />
          ) : (
            <div className="h-10 w-10 rounded border bg-muted" />
          )}

          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {value ? value.name : t("sponsorPicker.none")}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {value ? `#${value.sponsor_id}` : ""}
            </div>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {t("sponsorPicker.select")}
        </Button>

        <Button type="button" variant="ghost" onClick={() => onChange(null)} disabled={!value}>
          {t("sponsorPicker.clear")}
        </Button>
      </div>

      {/* Main picker modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("sponsorPicker.selectSponsor")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("images.search")}</Label>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("sponsorPicker.searchPlaceholder")}
                />
              </div>

              {sponsorsQ.isLoading && (
                <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
              )}
              {sponsorsQ.error && (
                <div className="text-sm text-red-600">{t("sponsorCreate.failed")}</div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((raw) => {
                  const id = pickId(raw);
                  if (!id) return null;
                  const nm = pickName(raw);
                  const logoPath = pickLogoPath(raw);

                  return (
                    <button
                      key={id}
                      type="button"
                      className="text-left rounded border p-2 hover:bg-muted transition-colors"
                      onClick={() => {
                        onChange({ sponsor_id: id, name: nm, logo_storage_path: logoPath });
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {logoPath ? (
                          <img
                            src={getStorageUrl(logoPath)}
                            alt={nm}
                            className="h-12 w-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded border bg-muted" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{nm}</div>
                          <div className="text-xs text-muted-foreground">#{id}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Button type="button" className="w-full" onClick={() => setCreateOpen(true)}>
                {t("sponsorPicker.createNew")}
              </Button>

              <div className="rounded border p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Selected</div>
                <div className="break-all">{value ? value.name : t("sponsorPicker.none")}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("sponsorPicker.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create sponsor modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("sponsorCreate.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("sponsorCreate.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("sponsorCreate.website")}</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t("sponsorCreate.logo")}</Label>
              <ImagePicker
                value={logo}
                onChange={setLogo}
                allowedScopes={["SPONSOR", "GLOBAL"]}
                labelKey="sponsorCreate.logo"
              />
              {!logo?.image_id && (
                <p className="text-xs text-red-600">Logo is required</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
              />
              <span className="text-sm">{t("sponsorCreate.watermark")}</span>
            </div>

            {watermarkEnabled && (
              <WatermarkEditor
                value={watermark}
                onChange={setWatermark}
                allowedScopesForImage={["SPONSOR", "GLOBAL"]}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("sponsorPicker.close")}
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !name.trim() || !logo?.image_id}
            >
              {createMut.isPending ? t("sponsorCreate.creating") : t("sponsorCreate.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
