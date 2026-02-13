// src/components/admin/events/event-sponsors-panel.tsx
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { attachEventSponsor, deleteEventSponsor } from "@/lib/api/events";
import { qk } from "@/lib/api/keys";
import { useI18n } from "@/components/i18n-provider";
import { SponsorPicker, type SponsorPickerValue } from "@/components/admin/sponsors/sponsor-picker";
import { Button } from "@/components/ui/button";
import { getStorageUrl } from "@/lib/storage";
import { SponsorEditModal } from "@/components/admin/sponsors/sponsor-edit-modal";

function pickSponsor(raw: any) {
  // event.sponsors might be EventSponsor rows with nested sponsor
  const sponsor = raw?.sponsor ?? raw;

  const sponsor_id =
    sponsor?.sponsor_id ?? sponsor?.id ?? raw?.sponsor_id ?? null;

  const name = sponsor?.name ?? raw?.name ?? "";

  const website_url = sponsor?.website_url ?? sponsor?.website ?? null;

  const logo_image =
    sponsor?.logo_image ?? sponsor?.logo ?? raw?.logo_image ?? raw?.logo ?? null;

  const watermark = sponsor?.watermark ?? sponsor?.watermark_config ?? null;

  const event_sponsor_id =
    raw?.event_sponsor_id ?? raw?.id ?? null;

  return { sponsor_id, name, website_url, logo_image, watermark, event_sponsor_id };
}

export function EventSponsorsPanel({ event }: { event: any }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const eventId = String(event.event_id ?? event.id);

  const [pickerValue, setPickerValue] = useState<SponsorPickerValue>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSponsor, setEditSponsor] = useState<any | null>(null);

  const attachMut = useMutation({
    mutationFn: (sponsor_id: number) => attachEventSponsor(eventId, { sponsor_id }),
    onSuccess: async () => {
      toast.success(t("event.sponsors.attached"));
      setPickerValue(null);
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
      await qc.invalidateQueries({ queryKey: qk.eventSponsors(eventId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("event.sponsors.attachFailed")),
  });

  const removeMut = useMutation({
    mutationFn: (eventSponsorId: string) => deleteEventSponsor(eventId, eventSponsorId),
    onSuccess: async () => {
      toast.success(t("event.sponsors.removed"));
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
      await qc.invalidateQueries({ queryKey: qk.eventSponsors(eventId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("event.sponsors.removeFailed")),
  });

  function onPickerChange(v: SponsorPickerValue) {
    setPickerValue(v);
    if (v?.sponsor_id) attachMut.mutate(v.sponsor_id);
  }

  const rows = useMemo(() => {
    const list: any[] = Array.isArray(event.sponsors) ? event.sponsors : [];
    return list
      .map(pickSponsor)
      .filter((x) => x.sponsor_id);
  }, [event.sponsors]);

  return (
    <div className="space-y-4">
      {/* Add sponsor: select or create inline -> immediate attach */}
      <SponsorPicker value={pickerValue} onChange={onPickerChange} labelKey="event.sponsors.add" />

      <div className="rounded border p-3 space-y-3">
        <div className="text-sm font-medium">{t("event.tabs.sponsors")}</div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("event.sponsors.none")}</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const logoPath =
                r.logo_image?.storage_path ??
                r.logo_image?.storagePath ??
                null;

              return (
                <div key={`${r.event_sponsor_id ?? r.sponsor_id}`} className="flex items-center justify-between gap-3 rounded border p-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {logoPath ? (
                      <img
                        src={getStorageUrl(logoPath)}
                        alt={r.name}
                        className="h-10 w-10 rounded border object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border bg-muted" />
                    )}

                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      {r.website_url && (
                        <div className="text-xs text-muted-foreground truncate">{r.website_url}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditSponsor({
                          sponsor_id: r.sponsor_id,
                          name: r.name,
                          website_url: r.website_url,
                          logo_image: r.logo_image,
                          watermark: r.watermark,
                        });
                        setEditOpen(true);
                      }}
                    >
                      {t("event.sponsors.edit")}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!r.event_sponsor_id) {
                          toast.error("Missing event_sponsor_id from backend response");
                          return;
                        }
                        removeMut.mutate(String(r.event_sponsor_id));
                      }}
                      disabled={removeMut.isPending}
                    >
                      {t("event.sponsors.remove")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SponsorEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        eventId={eventId}
        sponsor={editSponsor}
      />
    </div>
  );
}
