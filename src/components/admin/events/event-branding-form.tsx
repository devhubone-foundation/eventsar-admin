// src/components/admin/events/event-branding-form.tsx
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchEvent } from "@/lib/api/events";
import { qk } from "@/lib/api/keys";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";

export function EventBrandingForm({ event }: { event: any }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const eventId = String(event.event_id ?? event.id);
  const eventSlug = String(event.slug ?? "");

  const initialLogo: ImagePickerValue = event.logo_image
    ? {
      image_id: event.logo_image.image_id,
      storage_path: event.logo_image.storage_path,
      name: event.logo_image.name ?? null,
      mime_type: event.logo_image.mime_type ?? null,
      scope: event.logo_image.scope,
    }
    : null;

  const initialBg: ImagePickerValue = event.background_image
    ? {
      image_id: event.background_image.image_id,
      storage_path: event.background_image.storage_path,
      name: event.background_image.name ?? null,
      mime_type: event.background_image.mime_type ?? null,
      scope: event.background_image.scope,
    }
    : null;

  const [logo, setLogo] = useState<ImagePickerValue>(initialLogo);
  const [bg, setBg] = useState<ImagePickerValue>(initialBg);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        logo_image_id: logo?.image_id ?? null,
        background_image_id: bg?.image_id ?? null,
      };
      return patchEvent(eventId, payload);
    },
    onSuccess: async () => {
      toast.success(t("events.saved"));
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
      await qc.invalidateQueries({ queryKey: qk.events(undefined) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("events.saveFailed")),
  });

  const allowedScopes = useMemo(() => ["EVENT", "GLOBAL"] as const, []);

  return (
    <div className="space-y-4">
      <ImagePicker
        value={logo}
        onChange={setLogo}
        allowedScopes={[...allowedScopes]}
        eventSlug={eventSlug}
        labelKey="event.branding.logo"
      />

      <ImagePicker
        value={bg}
        onChange={setBg}
        allowedScopes={[...allowedScopes]}
        eventSlug={eventSlug}
        labelKey="event.branding.background"
      />

      <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? t("events.saving") : t("events.save")}
      </Button>
    </div>
  );
}
