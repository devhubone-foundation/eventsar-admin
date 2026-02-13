// src/components/admin/watermark/watermark-editor.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";
import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { useMetaEnums } from "@/lib/meta/use-meta";

export type WatermarkValue = {
  image_id?: number;
  position: "bottom_right" | "bottom_left" | "top_right" | "top_left" | "center";
  scale: number;
  opacity: number;
};

export function WatermarkEditor({
                                  value,
                                  onChange,
                                  allowedScopesForImage = ["GLOBAL", "SPONSOR", "EVENT"],
                                  eventSlug,
                                }: {
  value: WatermarkValue;
  onChange: (v: WatermarkValue) => void;
  allowedScopesForImage?: Array<"EVENT" | "SPONSOR" | "GLOBAL">;
  eventSlug?: string;
}) {
  const { t } = useI18n();

  const imagePickerValue: ImagePickerValue =
    value.image_id
      ? { image_id: value.image_id, storage_path: "", name: null, mime_type: null }
      : null;

  const meta = useMetaEnums();
  const positions = meta.enums.Watermark_Position ?? [];


  return (
    <div className="rounded border p-3 space-y-3">
      <div className="text-sm font-medium">{t("watermark.title")}</div>

      {/* Image (optional) */}
      <div className="space-y-1">
        <Label>{t("watermark.image")}</Label>
        <ImagePicker
          value={imagePickerValue}
          onChange={(img) => onChange({ ...value, image_id: img?.image_id })}
          allowedScopes={allowedScopesForImage}
          eventSlug={eventSlug}
          labelKey="watermark.image"
        />
        <div className="text-xs text-muted-foreground">
          (Optional) If empty, watermark is effectively disabled.
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>{t("watermark.position")}</Label>
          <Select
            value={value.position}
            onValueChange={(v) => onChange({ ...value, position: v as any })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {positions.map((p) => (
                <SelectItem key={p} value={p}>
                  {meta.enumLabel("Watermark_Position", p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("watermark.scale")}</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={value.scale}
            onChange={(e) => onChange({ ...value, scale: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("watermark.opacity")}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={value.opacity}
            onChange={(e) => onChange({ ...value, opacity: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
