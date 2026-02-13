"use client";

import { z } from "zod";
import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createExperience } from "@/lib/api/experiences";
import { qk } from "@/lib/api/keys";
import { useMetaEnums } from "@/lib/meta/use-meta";
import { useI18n } from "@/components/i18n-provider";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";
import { ModelPicker } from "@/components/admin/models/model-picker";

const schema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase kebab-case"),
  type: z.string().min(1),

  thumbnail_image_id: z.number().optional(),
  model_id: z.number().optional(),

  tracking_image_id: z.number().optional(),
  physical_width_meters: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
});

type FormValues = z.infer<typeof schema>;

export function CreateExperienceModal({
                                        open,
                                        onOpenChange,
                                        eventSlug,
                                      }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventSlug: string;
}) {
  const { t } = useI18n();
  const meta = useMetaEnums();
  const qc = useQueryClient();
  const router = useRouter();

  const params = useParams<{ lang: string; id: string }>();
  const lang = params.lang;
  const eventId = params.id;

  const types = (meta.enums.Experience_Type ?? []).filter((x) => x && x.trim());

  // keep selected images as objects so ImagePicker can preview them
  const [thumbImg, setThumbImg] = useState<ImagePickerValue>(null);
  const [trackImg, setTrackImg] = useState<ImagePickerValue>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: "",
      type: "",
      thumbnail_image_id: undefined,
      model_id: undefined,
      tracking_image_id: undefined,
      physical_width_meters: undefined,
    },
  });

  const selectedType = form.watch("type");
  const needsTracking = useMemo(
    () => selectedType === "IMAGE_TRACKING_AR" || selectedType === "STICKER_TRACKING_AR",
    [selectedType]
  );
  const needsModel = useMemo(
    () =>
      selectedType === "WORLD_AR_GLB" ||
      selectedType === "FACE_GLB" ||
      selectedType === "IMAGE_TRACKING_AR" ||
      selectedType === "STICKER_TRACKING_AR",
    [selectedType]
  );

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      if (needsModel && !v.model_id) throw new Error("model is required for this experience type");

      if (needsTracking) {
        if (!v.tracking_image_id) {
          throw new Error(`tracking image is required for ${selectedType || "this type"}`);
        }
        if (!v.physical_width_meters || v.physical_width_meters <= 0) {
          throw new Error("physical_width_meters must be > 0");
        }
      }

      return createExperience(eventId, {
        slug: v.slug,
        type: v.type,
        status: "DRAFT",
        thumbnail_image_id: v.thumbnail_image_id,
        model_id: v.model_id,
        tracking_image_id: v.tracking_image_id,
        physical_width_meters: v.physical_width_meters,
      });
    },
    onSuccess: async (created) => {
      toast.success("Created");
      onOpenChange(false);
      await qc.invalidateQueries({ queryKey: qk.eventExperiences(eventId) });
      await qc.invalidateQueries({ queryKey: ["experiences", String(eventId)] });

      const id = created?.experience_id ?? created?.id;
      if (id) router.push(`/${lang}/admin/experiences/${id}`);
      else router.push(`/${lang}/admin/events/${eventId}/experiences`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="4xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("experiences.create")}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(
            (v) => mut.mutate(v),
            () => toast.error("Please fix the highlighted fields.")
          )}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input {...form.register("slug")} placeholder="robot-detective" />
              {form.formState.errors.slug && (
                <p className="text-sm text-red-600">{String(form.formState.errors.slug.message)}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v, { shouldValidate: true })}
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Thumbnail (optional)</Label>
              <ImagePicker
                value={thumbImg}
                onChange={(img) => {
                  setThumbImg(img);
                  form.setValue("thumbnail_image_id", img?.image_id, { shouldValidate: true });
                }}
                allowedScopes={["EVENT", "SPONSOR", "GLOBAL"]}
                eventSlug={eventSlug}
              />
            </div>

            <div className="space-y-2">
              <Label>Model {needsModel ? "(required)" : "(optional)"}</Label>
              <ModelPicker
                value={form.watch("model_id") ?? null}
                onChange={(id) => form.setValue("model_id", id ?? undefined, { shouldValidate: true })}
                uploadDefaults={{ eventSlug }}
              />
              {needsModel && !form.watch("model_id") && (
                <p className="text-sm text-red-600">Model is required for this type.</p>
              )}
            </div>
          </div>

          {needsTracking && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Tracking image (required)</Label>
                <ImagePicker
                  value={trackImg}
                  onChange={(img) => {
                    setTrackImg(img);
                    form.setValue("tracking_image_id", img?.image_id, { shouldValidate: true });
                  }}
                  allowedScopes={["EVENT", "GLOBAL"]}
                  eventSlug={eventSlug}
                />
                {!form.watch("tracking_image_id") && selectedType && (
                  <p className="text-sm text-red-600">Tracking image is required for {selectedType}.</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Physical width (meters)</Label>
                <Input
                  type="number"
                  step="0.001"
                  {...form.register("physical_width_meters")}
                  placeholder="0.12"
                />
                {form.formState.errors.physical_width_meters && (
                  <p className="text-sm text-red-600">
                    {String(form.formState.errors.physical_width_meters.message)}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
