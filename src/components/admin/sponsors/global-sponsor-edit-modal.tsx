"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { qk } from "@/lib/api/keys";
import { getSponsor, patchSponsor } from "@/lib/api/sponsors";
import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { WatermarkEditor, type WatermarkValue } from "@/components/admin/watermark/watermark-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SponsorFormState = {
  name: string;
  website: string;
  logo: ImagePickerValue;
  watermarkEnabled: boolean;
  watermark: WatermarkValue;
};

function pick(raw: unknown, key: string): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as Record<string, unknown>)[key];
}

function defaultWatermark(): WatermarkValue {
  return {
    position: "bottom_right",
    scale: 1,
    opacity: 1,
  };
}

function toSponsorFormState(raw: unknown): SponsorFormState {
  const logoImageRaw = pick(raw, "logo_image");
  const logoRaw = pick(raw, "logo");
  const logoObj =
    logoImageRaw && typeof logoImageRaw === "object"
      ? (logoImageRaw as Record<string, unknown>)
      : logoRaw && typeof logoRaw === "object"
        ? (logoRaw as Record<string, unknown>)
        : null;

  const logo =
    logoObj &&
    typeof logoObj.image_id === "number" &&
    typeof logoObj.storage_path === "string"
      ? {
          image_id: logoObj.image_id,
          storage_path: logoObj.storage_path,
          name: typeof logoObj.name === "string" ? logoObj.name : null,
          mime_type: typeof logoObj.mime_type === "string" ? logoObj.mime_type : null,
        }
      : null;

  const watermarkRaw = pick(raw, "watermark");
  const watermarkCfgRaw = pick(raw, "watermark_config");
  const wmObj =
    watermarkRaw && typeof watermarkRaw === "object"
      ? (watermarkRaw as Record<string, unknown>)
      : watermarkCfgRaw && typeof watermarkCfgRaw === "object"
        ? (watermarkCfgRaw as Record<string, unknown>)
        : null;
  const wmImageNested = wmObj?.image;
  const wmImageNestedObj =
    wmImageNested && typeof wmImageNested === "object" ? (wmImageNested as Record<string, unknown>) : null;
  const wmImageId =
    typeof wmObj?.image_id === "number"
      ? wmObj.image_id
      : typeof wmImageNestedObj?.image_id === "number"
        ? wmImageNestedObj.image_id
        : undefined;

  return {
    name: typeof pick(raw, "name") === "string" ? (pick(raw, "name") as string) : "",
    website: typeof pick(raw, "website_url") === "string" ? (pick(raw, "website_url") as string) : "",
    logo,
    watermarkEnabled: typeof wmImageId === "number",
    watermark:
      typeof wmImageId === "number"
        ? {
            image_id: wmImageId,
            position:
              typeof wmObj?.position === "string"
                ? (wmObj.position as "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center")
                : "bottom_right",
            scale: typeof wmObj?.scale === "number" ? wmObj.scale : 1,
            opacity: typeof wmObj?.opacity === "number" ? wmObj.opacity : 1,
          }
        : defaultWatermark(),
  };
}

function SponsorEditForm({
  sponsorId,
  initial,
  onClose,
  onUpdated,
}: {
  sponsorId: number;
  initial: SponsorFormState;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [name, setName] = useState(initial.name);
  const [website, setWebsite] = useState(initial.website);
  const [logo, setLogo] = useState<ImagePickerValue>(initial.logo);
  const [watermarkEnabled, setWatermarkEnabled] = useState(initial.watermarkEnabled);
  const [watermark, setWatermark] = useState<WatermarkValue>(initial.watermark);

  const canSave = useMemo(() => Boolean(name.trim()) && Boolean(logo?.image_id), [name, logo]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (!logo?.image_id) throw new Error("Logo is required");

      return patchSponsor(sponsorId, {
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
      await qc.invalidateQueries({ queryKey: qk.sponsor(sponsorId) });
      await qc.invalidateQueries({ queryKey: ["sponsors"] });
      onClose();
      onUpdated?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("event.sponsors.updateFailed")),
  });

  return (
    <>
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
        <Button variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={!canSave || saveMut.isPending}>
          {saveMut.isPending ? t("events.saving") : t("events.save")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function GlobalSponsorEditModal({
  open,
  onOpenChange,
  sponsorId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sponsorId: number | null;
  onUpdated?: () => void;
}) {
  const { t } = useI18n();

  const sponsorQ = useQuery({
    queryKey: qk.sponsor(sponsorId ?? "none"),
    queryFn: async () => {
      if (!sponsorId) throw new Error("Missing sponsor id");
      return getSponsor(sponsorId);
    },
    enabled: open && Boolean(sponsorId),
  });

  const formInitial = useMemo(() => toSponsorFormState(sponsorQ.data), [sponsorQ.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("event.sponsors.editTitle")}</DialogTitle>
        </DialogHeader>

        {sponsorQ.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : sponsorQ.error || !sponsorId ? (
          <>
            <div className="text-sm text-red-600">{t("event.sponsors.updateFailed")}</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <SponsorEditForm
            key={`${sponsorId}:${String(pick(sponsorQ.data, "updated_at") ?? "na")}`}
            sponsorId={sponsorId}
            initial={formInitial}
            onClose={() => onOpenChange(false)}
            onUpdated={onUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
