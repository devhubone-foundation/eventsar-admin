// src/components/admin/sponsors/sponsor-edit-modal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchSponsor } from "@/lib/api/sponsors";
import { qk } from "@/lib/api/keys";
import { useI18n } from "@/components/i18n-provider";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { WatermarkEditor, type WatermarkValue } from "@/components/admin/watermark/watermark-editor";

export function SponsorEditModal({
                                   open,
                                   onOpenChange,
                                   eventId,
                                   sponsor,
                                 }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  sponsor: {
    sponsor_id: number;
    name: string;
    website_url?: string | null;
    logo_image?: { image_id: number; storage_path: string; name?: string | null; mime_type?: string | null } | null;
    watermark?: any | null;
  } | null;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState<ImagePickerValue>(null);

  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkValue>({
    position: "bottom_right",
    scale: 1,
    opacity: 1,
  });

  useEffect(() => {
    if (!sponsor) return;
    setName(sponsor.name ?? "");
    setWebsite(sponsor.website_url ?? "");
    setLogo(
      sponsor.logo_image
        ? {
          image_id: sponsor.logo_image.image_id,
          storage_path: sponsor.logo_image.storage_path,
          name: sponsor.logo_image.name ?? null,
          mime_type: sponsor.logo_image.mime_type ?? null,
        }
        : null
    );

    // best-effort hydrate watermark if present
    const wm = sponsor.watermark ?? null;
    if (wm && (wm.image_id || wm.image?.image_id)) {
      setWatermarkEnabled(true);
      setWatermark({
        image_id: wm.image_id ?? wm.image?.image_id,
        position: wm.position ?? "bottom_right",
        scale: wm.scale ?? 1,
        opacity: wm.opacity ?? 1,
      });
    } else {
      setWatermarkEnabled(false);
      setWatermark({ position: "bottom_right", scale: 1, opacity: 1 });
    }
  }, [sponsor]);

  const canSave = useMemo(() => Boolean(name.trim()) && Boolean(logo?.image_id), [name, logo]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!sponsor) throw new Error("No sponsor");
      if (!name.trim()) throw new Error("Name required");
      if (!logo?.image_id) throw new Error("Logo required");

      return patchSponsor(sponsor.sponsor_id, {
        name: name.trim(),
        website_url: website.trim() || null,
        logo_image_id: logo.image_id,
        watermark:
          watermarkEnabled && watermark.image_id
            ? {
              image_id: watermark.image_id,
              position: watermark.position,
              scale: watermark.scale,
              opacity: watermark.opacity,
            }
            : null,
      });
    },
    onSuccess: async () => {
      toast.success(t("event.sponsors.updated"));
      onOpenChange(false);

      // refresh sponsor picker lists and event detail sponsors
      await qc.invalidateQueries({ queryKey: qk.sponsors(undefined) });
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("event.sponsors.updateFailed")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("event.sponsors.editTitle")}</DialogTitle>
        </DialogHeader>

        {!sponsor ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : (
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
              {!logo?.image_id && <p className="text-xs text-red-600">Logo is required</p>}
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !canSave}>
            {mut.isPending ? t("events.saving") : t("events.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
