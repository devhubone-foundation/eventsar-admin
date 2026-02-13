// src/components/admin/experiences/experience-content-form.tsx
"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import { updateExperience, stripUndefined } from "@/lib/api/experience-update";
import { useMetaEnums } from "@/lib/meta/use-meta";
import { useI18n } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { ModelPicker } from "@/components/admin/models/model-picker";

type Experience = any;

const slugSchema = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase kebab-case");

const numOpt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().finite().optional()
);

const vec3Schema = z.object({
  x: numOpt,
  y: numOpt,
  z: numOpt,
});

const schema = z.object({
  slug: slugSchema.optional(),
  type: z.string().min(1).optional(),

  thumbnail_image_id: z.number().optional(),
  model_id: z.number().optional(),

  tracking_image_id: z.number().optional(),
  physical_width_meters: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().positive().optional()
  ),

  face_anchor: z.string().optional(),

  placement_scale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  placement_position_offset: vec3Schema,
  placement_rotation_euler: vec3Schema,

  allow_move: z.boolean().optional(),
  allow_rotate: z.boolean().optional(),
  allow_scale: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

function vecDefaults(v: any) {
  return {
    x: v?.x ?? undefined,
    y: v?.y ?? undefined,
    z: v?.z ?? undefined,
  };
}

function allEmptyVec3(v: { x?: number; y?: number; z?: number }) {
  return v.x === undefined && v.y === undefined && v.z === undefined;
}

export function ExperienceContentForm({
                                        experience,
                                        eventSlug,
                                      }: {
  experience: Experience;
  eventSlug: string | null;
}) {
  const { t } = useI18n();
  const meta = useMetaEnums();
  const qc = useQueryClient();

  const experienceId = experience.experience_id ?? experience.id;
  const eventId = experience.event_id;

  const types = (meta.enums.Experience_Type ?? []).filter((x) => x && x.trim());

  // ✅ FIX: keep selected images as state, so the picker UI updates
  const [thumbImg, setThumbImg] = useState<ImagePickerValue>(experience.thumbnail_image ?? null);
  const [trackImg, setTrackImg] = useState<ImagePickerValue>(experience.tracking_image ?? null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: experience.slug ?? "",
      type: experience.type ?? "",

      thumbnail_image_id: experience.thumbnail_image_id ?? undefined,
      model_id: experience.model_id ?? undefined,

      tracking_image_id: experience.tracking_image_id ?? undefined,
      physical_width_meters: experience.physical_width_meters ?? undefined,

      face_anchor: experience.face_anchor ?? undefined,

      placement_scale: experience.placement_scale ?? 1,
      placement_position_offset: vecDefaults(experience.placement_position_offset),
      placement_rotation_euler: vecDefaults(experience.placement_rotation_euler),

      allow_move: experience.allow_move ?? true,
      allow_rotate: experience.allow_rotate ?? true,
      allow_scale: experience.allow_scale ?? true,
    },
  });

  const selectedType = form.watch("type") || experience.type;
  const isTracking = selectedType === "IMAGE_TRACKING_AR" || selectedType === "STICKER_TRACKING_AR";
  const isFace = selectedType === "FACE_GLB";
  const needsModel =
    selectedType === "WORLD_AR_GLB" ||
    selectedType === "FACE_GLB" ||
    selectedType === "IMAGE_TRACKING_AR" ||
    selectedType === "STICKER_TRACKING_AR";

  // ✅ keep form + picker previews synced when experience refetches
  useEffect(() => {
    form.reset({
      slug: experience.slug ?? "",
      type: experience.type ?? "",

      thumbnail_image_id: experience.thumbnail_image_id ?? undefined,
      model_id: experience.model_id ?? undefined,

      tracking_image_id: experience.tracking_image_id ?? undefined,
      physical_width_meters: experience.physical_width_meters ?? undefined,

      face_anchor: experience.face_anchor ?? undefined,

      placement_scale: experience.placement_scale ?? 1,
      placement_position_offset: vecDefaults(experience.placement_position_offset),
      placement_rotation_euler: vecDefaults(experience.placement_rotation_euler),

      allow_move: experience.allow_move ?? true,
      allow_rotate: experience.allow_rotate ?? true,
      allow_scale: experience.allow_scale ?? true,
    });

    setThumbImg(experience.thumbnail_image ?? null);
    setTrackImg(experience.tracking_image ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceId, experience.updated_at]);

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      // keep your frontend helper rules
      if (needsModel && !v.model_id) throw new Error("Model is required for this experience type.");

      if (isTracking) {
        if (!v.tracking_image_id) {
          throw new Error(`Tracking image is required for ${selectedType}.`);
        }
        if (!v.physical_width_meters || v.physical_width_meters <= 0) {
          throw new Error("physical_width_meters must be > 0");
        }
      }

      const payload = stripUndefined({
        slug: v.slug,
        type: v.type,

        thumbnail_image_id: v.thumbnail_image_id,
        model_id: v.model_id,

        tracking_image_id: v.tracking_image_id,
        physical_width_meters: v.physical_width_meters,

        face_anchor: v.face_anchor,

        placement_scale: v.placement_scale,
        placement_position_offset: allEmptyVec3(v.placement_position_offset)
          ? undefined
          : v.placement_position_offset,
        placement_rotation_euler: allEmptyVec3(v.placement_rotation_euler)
          ? undefined
          : v.placement_rotation_euler,

        allow_move: v.allow_move,
        allow_rotate: v.allow_rotate,
        allow_scale: v.allow_scale,
      });

      return updateExperience(experienceId, payload as any);
    },
    onSuccess: async () => {
      toast.success(t("common.saved"));
      await qc.invalidateQueries({ queryKey: qk.experience(experienceId) });

      if (eventId) {
        await qc.invalidateQueries({ queryKey: qk.eventExperiences(eventId) });
        await qc.invalidateQueries({ queryKey: ["experiences", String(eventId)] });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.saveFailed")),
  });

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(
        (v) => mut.mutate(v),
        () => toast.error("Please fix the highlighted fields.")
      )}
    >
      {/* Content */}
      <div className="rounded border p-4 space-y-4">
        <div className="text-sm font-medium">{t("experiences.tabs.content")}</div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input {...form.register("slug")} />
            {form.formState.errors.slug && (
              <p className="text-sm text-red-600">{String(form.formState.errors.slug.message)}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={form.watch("type") ?? ""}
              onValueChange={(v) => form.setValue("type", v, { shouldValidate: true, shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((x) => (
                  <SelectItem key={x} value={x}>
                    {meta.enumLabel("Experience_Type", x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-red-600">{String(form.formState.errors.type.message)}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Thumbnail (optional)</Label>
            <ImagePicker
              value={thumbImg}
              onChange={(img) => {
                setThumbImg(img);
                form.setValue("thumbnail_image_id", img?.image_id, { shouldValidate: true });
              }}
              allowedScopes={["EVENT", "SPONSOR", "GLOBAL"]}
              eventSlug={eventSlug ?? undefined}
            />
          </div>

          <div className="space-y-2">
            <Label>Model {needsModel ? "(required)" : "(optional)"}</Label>
            <ModelPicker
              value={form.watch("model_id") ?? null}
              onChange={(id) => form.setValue("model_id", id ?? undefined, { shouldValidate: true })}
              uploadDefaults={{ eventSlug: eventSlug ?? "" }}
            />
            {needsModel && !form.watch("model_id") && (
              <p className="text-sm text-red-600">Model is required for this type.</p>
            )}
          </div>
        </div>

        {isTracking && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tracking image (required)</Label>
              <ImagePicker
                value={trackImg}
                onChange={(img) => {
                  setTrackImg(img);
                  form.setValue("tracking_image_id", img?.image_id, { shouldValidate: true });
                }}
                allowedScopes={["EVENT", "GLOBAL"]}
                eventSlug={eventSlug ?? undefined}
              />
              {!form.watch("tracking_image_id") && <p className="text-sm text-red-600">Tracking image is required.</p>}
            </div>

            <div className="space-y-1">
              <Label>Physical width (meters)</Label>
              <Input type="number" step="0.001" {...form.register("physical_width_meters")} />
              {form.formState.errors.physical_width_meters && (
                <p className="text-sm text-red-600">
                  {String(form.formState.errors.physical_width_meters.message)}
                </p>
              )}
            </div>
          </div>
        )}

        {isFace && (
          <div className="space-y-1">
            <Label>Face anchor</Label>
            <Input {...form.register("face_anchor")} placeholder="HEAD" />
          </div>
        )}
      </div>

      {/* Placement */}
      <div className="rounded border p-4 space-y-4">
        <div className="text-sm font-medium">{t("experiences.tabs.placement")}</div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Scale</Label>
            <Input type="number" step="0.01" min="0.01" {...form.register("placement_scale")} />
            {form.formState.errors.placement_scale && (
              <p className="text-sm text-red-600">{String(form.formState.errors.placement_scale.message)}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Position offset</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>X</Label>
                <Input type="number" step="0.01" {...form.register("placement_position_offset.x")} />
              </div>
              <div className="space-y-1">
                <Label>Y</Label>
                <Input type="number" step="0.01" {...form.register("placement_position_offset.y")} />
              </div>
              <div className="space-y-1">
                <Label>Z</Label>
                <Input type="number" step="0.01" {...form.register("placement_position_offset.z")} />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Leave empty to keep backend value unchanged.</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Rotation (Euler)</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>X</Label>
                <Input type="number" step="1" {...form.register("placement_rotation_euler.x")} />
              </div>
              <div className="space-y-1">
                <Label>Y</Label>
                <Input type="number" step="1" {...form.register("placement_rotation_euler.y")} />
              </div>
              <div className="space-y-1">
                <Label>Z</Label>
                <Input type="number" step="1" {...form.register("placement_rotation_euler.z")} />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Leave empty to keep backend value unchanged.</div>
          </div>
        </div>
      </div>

      {/* Interaction */}
      <div className="rounded border p-4 space-y-4">
        <div className="text-sm font-medium">{t("experiences.tabs.interaction")}</div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between gap-3 rounded border p-3">
            <div>
              <div className="text-sm font-medium">Allow move</div>
              <div className="text-xs text-muted-foreground">User can drag/translate</div>
            </div>
            <Switch
              checked={Boolean(form.watch("allow_move"))}
              onCheckedChange={(v) => form.setValue("allow_move", v, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded border p-3">
            <div>
              <div className="text-sm font-medium">Allow rotate</div>
              <div className="text-xs text-muted-foreground">User can rotate</div>
            </div>
            <Switch
              checked={Boolean(form.watch("allow_rotate"))}
              onCheckedChange={(v) => form.setValue("allow_rotate", v, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded border p-3">
            <div>
              <div className="text-sm font-medium">Allow scale</div>
              <div className="text-xs text-muted-foreground">User can pinch-scale</div>
            </div>
            <Switch
              checked={Boolean(form.watch("allow_scale"))}
              onCheckedChange={(v) => form.setValue("allow_scale", v, { shouldDirty: true })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
