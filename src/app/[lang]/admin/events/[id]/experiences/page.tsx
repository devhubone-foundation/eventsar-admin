// app/[lang]/admin/events/[id]/experiences/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { qk } from "@/lib/api/keys";
import { listEventExperiences } from "@/lib/api/experiences";
import { getEvent } from "@/lib/api/events";
import { useI18n } from "@/components/i18n-provider";

import { EventExperiencesTable } from "@/components/admin/experiences/event-experiences-table";
import { Button } from "@/components/ui/button";
import { CreateExperienceModal } from "@/components/admin/experiences/create-experience-modal";

export default function EventExperiencesPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [open, setOpen] = useState(false);

  const { data: event } = useQuery({
    queryKey: qk.event(eventId),
    queryFn: () => getEvent(eventId),
  });

  const paramsObj = useMemo(
    () => ({ page: 1, pageSize: 50, sortBy: "sort_order", sortDir: "asc" }),
    []
  );

  const { data, isLoading, error } = useQuery({
    queryKey: qk.experiences(eventId, paramsObj),
    queryFn: () => listEventExperiences(eventId, paramsObj),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (error || !data) return <div className="text-sm text-red-600">{t("events.loadFailed")}</div>;

  const eventSlug = String(event?.slug ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">{t("experiences.title")}</h1>
        <Button onClick={() => setOpen(true)} disabled={!eventSlug}>
          Create experience
        </Button>
      </div>

      {!eventSlug && (
        <div className="text-sm text-red-600">
          Missing event slug (cannot upload event-scoped assets).
        </div>
      )}

      <EventExperiencesTable eventId={eventId} initialItems={data.items ?? []} />

      <CreateExperienceModal open={open} onOpenChange={setOpen} eventSlug={eventSlug} />
    </div>
  );
}
