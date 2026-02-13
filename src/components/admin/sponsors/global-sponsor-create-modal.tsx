"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { createSponsor } from "@/lib/api/sponsors";
import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { WatermarkEditor, type WatermarkValue } from "@/components/admin/watermark/watermark-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function defaultWatermark(): WatermarkValue {
  return {
    position: "bottom_right",
    scale: 1,
    opacity: 1,
  };
}

export function GlobalSponsorCreateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState<ImagePickerValue>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkValue>(defaultWatermark);

  const canCreate = useMemo(() => Boolean(name.trim()) && Boolean(logo?.image_id), [name, logo]);

  function resetForm() {
    setName("");
    setWebsite("");
    setLogo(null);
    setWatermarkEnabled(false);
    setWatermark(defaultWatermark());
  }

  const createMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (!logo?.image_id) throw new Error("Logo is required");

      const payload: {
        name: string;
        website_url?: string;
        logo_image_id: number;
        watermark?: {
          image_id: number;
          position: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
          scale: number;
          opacity: number;
        };
      } = {
        name: name.trim(),
        website_url: website.trim() || undefined,
        logo_image_id: logo.image_id,
      };

      if (watermarkEnabled && watermark.image_id) {
        payload.watermark = {
          image_id: watermark.image_id,
          position: watermark.position,
          scale: watermark.scale,
          opacity: watermark.opacity,
        };
      }

      return createSponsor(payload);
    },
    onSuccess: async () => {
      toast.success(t("sponsorCreate.created"));
      await qc.invalidateQueries({ queryKey: ["sponsors"] });
      onOpenChange(false);
      resetForm();
      onCreated?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("sponsorCreate.failed")),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
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
            {!logo?.image_id && <p className="text-xs text-red-600">Logo is required</p>}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
            />
            <span className="text-sm">{t("sponsorCreate.watermark")}</span>
          </label>

          {watermarkEnabled && (
            <WatermarkEditor
              value={watermark}
              onChange={setWatermark}
              allowedScopesForImage={["SPONSOR", "GLOBAL"]}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !canCreate}>
            {createMut.isPending ? t("sponsorCreate.creating") : t("sponsorCreate.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
