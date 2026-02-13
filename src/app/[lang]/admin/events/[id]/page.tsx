"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api/keys";
import { getEvent } from "@/lib/api/events";
import { useI18n } from "@/components/i18n-provider";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { EventOverviewForm } from "@/components/admin/events/event-overview-form";
import { EventBrandingForm } from "@/components/admin/events/event-branding-form";
import { EventSponsorsPanel } from "@/components/admin/events/event-sponsors-panel";
import { EventLocalizationsPanel } from "@/components/admin/events/event-localizations-panel";
import { QrCard } from "@/components/admin/qr/qr-card";

export default function EventDetailPage() {
  const { t } = useI18n();

  // ✅ Get BOTH id and lang from route
  const params = useParams<{ id: string; lang: string }>();
  const id = params.id;
  const lang = params.lang;

  const { data: event, isLoading, error } = useQuery({
    queryKey: qk.event(id),
    queryFn: () => getEvent(id),
  });

  const eventSlug = String(event?.slug ?? "");
  const eventQrPayload = useMemo(
    () =>
      JSON.stringify({
        v: 1,
        kind: "EVENT",
        event_slug: eventSlug,
      }),
    [eventSlug]
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (error || !event) {
    return <div className="text-sm text-red-600">{t("events.loadFailed")}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">
            {event.slug ?? `Event #${id}`}
          </h1>
          <div className="text-xs text-muted-foreground">
            {event.status ?? ""}
          </div>
        </div>

        {/* ✅ Now lang is defined */}
        <Button asChild variant="outline" size="sm">
          <Link href={`/${lang}/admin/events/${id}/experiences`}>
            Experiences
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("event.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="branding">{t("event.tabs.branding")}</TabsTrigger>
          <TabsTrigger value="localizations">{t("event.tabs.localizations")}</TabsTrigger>
          <TabsTrigger value="sponsors">{t("event.tabs.sponsors")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="space-y-4">
            <EventOverviewForm event={event} />
            <QrCard
              title={t("event.qr.title")}
              subtitle={t("event.qr.subtitle")}
              helperText={t("event.qr.payloadLabel")}
              value={eventQrPayload}
              copyValues={[
                { label: t("event.qr.copySlug"), value: eventSlug },
                { label: t("event.qr.copyPayload"), value: eventQrPayload },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="branding" className="pt-4">
          <EventBrandingForm event={event} />
        </TabsContent>

        <TabsContent value="localizations" className="pt-4">
          <EventLocalizationsPanel event={event} />
        </TabsContent>

        <TabsContent value="sponsors" className="pt-4">
          <EventSponsorsPanel event={event} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
