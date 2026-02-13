"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import { patchExperienceWatermark } from "@/lib/api/experiences";
import { useI18n } from "@/components/i18n-provider";
import { WatermarkEditor, type WatermarkValue } from "@/components/admin/watermark/watermark-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  experience: {
    experience_id?: number | string;
    id?: number | string;
    event_id?: number | string;
    watermark_config?: {
      image_id?: number;
      image?: { image_id?: number } | null;
      position?: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
      scale?: number;
      opacity?: number;
    } | null;
  };
  eventSlug: string | null;
};

function toWatermarkValue(raw: Props["experience"]["watermark_config"]): WatermarkValue {
  if (!raw) {
    return {
      position: "bottom_right",
      scale: 1,
      opacity: 1,
    };
  }

  return {
    image_id: raw.image_id ?? raw.image?.image_id ?? undefined,
    position: raw.position ?? "bottom_right",
    scale: typeof raw.scale === "number" ? raw.scale : 1,
    opacity: typeof raw.opacity === "number" ? raw.opacity : 1,
  };
}

export function ExperienceWatermarkForm({ experience, eventSlug }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const experienceId = experience.experience_id ?? experience.id;
  const eventId = experience.event_id;

  const sourceWatermark = useMemo(
    () => experience.watermark_config ?? null,
    [experience.watermark_config]
  );

  const [enabled, setEnabled] = useState<boolean>(Boolean(sourceWatermark));
  const [watermark, setWatermark] = useState<WatermarkValue>(() => toWatermarkValue(sourceWatermark));

  const mut = useMutation({
    mutationFn: async () => {
      if (!enabled) {
        return patchExperienceWatermark(experienceId, { watermark_config_id: null });
      }

      return patchExperienceWatermark(experienceId, {
        watermark: {
          image_id: watermark.image_id,
          position: watermark.position,
          scale: watermark.scale,
          opacity: watermark.opacity,
        },
      });
    },
    onSuccess: async () => {
      toast.success(t("common.saved"));
      await qc.invalidateQueries({ queryKey: qk.experience(experienceId) });

      if (eventId) {
        await qc.invalidateQueries({ queryKey: qk.eventExperiences(eventId) });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.saveFailed")),
  });

  return (
    <div className="rounded border p-4 space-y-4">
      <div className="text-sm font-medium">{t("experiences.tabs.watermark")}</div>

      <div className="flex items-center justify-between rounded border p-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="experience-watermark-enabled">{t("watermark.enabled")}</Label>
          <div className="text-xs text-muted-foreground">
            {enabled ? t("watermark.optionalHelp") : t("watermark.disableHelp")}
          </div>
        </div>
        <Switch
          id="experience-watermark-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {enabled && (
        <WatermarkEditor
          value={watermark}
          onChange={setWatermark}
          allowedScopesForImage={["GLOBAL", "SPONSOR", "EVENT"]}
          eventSlug={eventSlug ?? undefined}
        />
      )}

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
