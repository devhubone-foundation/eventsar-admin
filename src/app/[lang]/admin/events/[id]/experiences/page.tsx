// src/app/[lang]/admin/events/[eventId]/experiences/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api/keys";
import { listEventExperiences } from "@/lib/api/experiences";
import { useI18n } from "@/components/i18n-provider";
import { EventExperiencesTable } from "@/components/admin/experiences/event-experiences-table";

export default function EventExperiencesPage() {
  const { t } = useI18n();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const { data, isLoading, error } = useQuery({
    queryKey: qk.eventExperiences(eventId),
    queryFn: () => listEventExperiences(eventId),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (error || !data) return <div className="text-sm text-red-600">{t("events.loadFailed")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{t("experiences.title")}</h1>
      <EventExperiencesTable eventId={eventId} initialItems={data.items ?? []} />
    </div>
  );
}
