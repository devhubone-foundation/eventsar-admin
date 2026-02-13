// app/[lang]/admin/experiences/[id]/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import { getExperience } from "@/lib/api/experiences";
import { getEvent } from "@/lib/api/events";
import { setExperienceStatus } from "@/lib/api/experience-status";
import { config } from "@/lib/config";
import { useMetaEnums } from "@/lib/meta/use-meta";
import { useI18n } from "@/components/i18n-provider";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ExperienceContentForm } from "@/components/admin/experiences/experience-content-form";
import { ExperienceLocalizationsForm } from "@/components/admin/experiences/experience-localizations-form";
import { ExperienceSponsorsForm } from "@/components/admin/experiences/experience-sponsors-form";
import { ExperienceWatermarkForm } from "@/components/admin/experiences/experience-watermark-form";
import { QrCard } from "@/components/admin/qr/qr-card";

export default function ExperienceDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string; lang: string }>();
  const id = params.id;
  const lang = params.lang;
  const router = useRouter();

  const qc = useQueryClient();
  const meta = useMetaEnums();

  const expQ = useQuery({
    queryKey: qk.experience(id),
    queryFn: () => getExperience(id),
  });

  const exp = expQ.data;

  // fetch event slug for uploads in pickers (needs exp.event_id)
  const eventQ = useQuery({
    queryKey: exp?.event_id ? qk.event(exp.event_id) : ["event", "missing"],
    queryFn: () => getEvent(exp.event_id),
    enabled: Boolean(exp?.event_id),
  });

  const eventSlug = String(eventQ.data?.slug ?? "");
  const experienceSlug = String(exp?.slug ?? "");
  const canGenerateExperienceQr = Boolean(eventSlug && experienceSlug);
  const [isTestingResolve, setIsTestingResolve] = useState(false);

  const experienceQrPayload = useMemo(
    () =>
      JSON.stringify({
        v: 1,
        kind: "EXPERIENCE",
        event_slug: eventSlug,
        experience_slug: experienceSlug,
      }),
    [eventSlug, experienceSlug]
  );

  const resolveUrl = useMemo(() => {
    if (!canGenerateExperienceQr) return "";
    const base = config.apiBaseUrl.replace(/\/+$/, "");
    if (!base) return "";
    const eventPart = encodeURIComponent(eventSlug);
    const expPart = encodeURIComponent(experienceSlug);
    const langPart = encodeURIComponent(lang || "en");
    return `${base}/api/events/${eventPart}/experiences/${expPart}?lang=${langPart}`;
  }, [canGenerateExperienceQr, eventSlug, experienceSlug, lang]);

  const statuses: string[] = useMemo(() => {
    const raw = meta.enums.Experience_Status ?? [];
    return (raw as string[]).filter((x) => x && x.trim());
  }, [meta.enums.Experience_Status]);

  const [statusDraft, setStatusDraft] = useState<string | null>(null);

  const currentStatus = String(exp?.status ?? "");
  const statusValue = statusDraft ?? currentStatus;

  const statusMut = useMutation({
    mutationFn: async (nextStatus: string) => {
      if (!nextStatus) throw new Error("Missing status");
      return setExperienceStatus(id, nextStatus);
    },
    onSuccess: async () => {
      toast.success(t("common.saved"));
      setStatusDraft(null);
      await qc.invalidateQueries({ queryKey: qk.experience(id) });

      const eventId = exp?.event_id;
      if (eventId) {
        await qc.invalidateQueries({ queryKey: qk.eventExperiences(eventId) });
        await qc.invalidateQueries({ queryKey: ["experiences", String(eventId)] });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.saveFailed")),
  });

  if (expQ.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (expQ.error || !exp) {
    return <div className="text-sm text-red-600">{t("experiences.loadFailed")}</div>;
  }

  const canSaveStatus = Boolean(statusDraft && statusDraft !== currentStatus);

  // Normalize backend shape: you said it's Experience_Localization
  const expLocs = (exp.Experience_Localization ?? exp.localizations ?? []) as Array<any>;
  const expSponsors = (exp.experience_sponsors ?? exp.sponsors ?? exp.Experience_Sponsors ?? []) as Array<any>;

  const onTestResolve = async () => {
    if (!resolveUrl) {
      toast.error("NEXT_PUBLIC_API_BASE_URL is not set");
      return;
    }
    setIsTestingResolve(true);
    try {
      const res = await fetch(resolveUrl, { method: "GET" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      toast.success(t("experience.qr.resolveSuccess"));
    } catch (e) {
      const message = e instanceof Error ? e.message : t("experience.qr.resolveFailed");
      toast.error(`${t("experience.qr.resolveFailed")}: ${message}`);
    } finally {
      setIsTestingResolve(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        <h1 className="text-lg font-semibold">{exp.slug ?? `Experience #${id}`}</h1>
        <div className="text-xs text-muted-foreground">
          {exp.type ?? ""} • {exp.status ?? ""}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("common.overview")}</TabsTrigger>
          <TabsTrigger value="content">{t("experiences.tabs.content")}</TabsTrigger>
          <TabsTrigger value="localizations">{t("experiences.tabs.localizations")}</TabsTrigger>
          <TabsTrigger value="sponsors">{t("experiences.tabs.sponsors")}</TabsTrigger>
          <TabsTrigger value="watermark">{t("experiences.tabs.watermark")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="rounded border p-4 space-y-4">
            <div className="text-sm font-medium">{t("common.overview")}</div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Slug</Label>
                <div className="text-sm rounded border bg-muted/30 px-3 py-2">{exp.slug}</div>
                <div className="text-xs text-muted-foreground">{t("experiences.slugEditableHint")}</div>
              </div>

              <div className="space-y-1">
                <Label>Type</Label>
                <div className="text-sm rounded border bg-muted/30 px-3 py-2">{exp.type}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={(v) => setStatusDraft(v)}
                  disabled={meta.isLoading || statusMut.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {meta.enumLabel("Experience_Status", s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => statusMut.mutate(statusValue)} disabled={!canSaveStatus || statusMut.isPending}>
                {statusMut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>

            {canGenerateExperienceQr ? (
              <QrCard
                title={t("experience.qr.title")}
                subtitle={t("experience.qr.subtitle")}
                helperText={t("experience.qr.payloadLabel")}
                value={experienceQrPayload}
                copyValues={[
                  { label: t("experience.qr.copyEventSlug"), value: eventSlug },
                  { label: t("experience.qr.copyExperienceSlug"), value: experienceSlug },
                  { label: t("experience.qr.copyPayload"), value: experienceQrPayload },
                ]}
                actionButtons={[
                  {
                    label: isTestingResolve ? t("experience.qr.resolving") : t("experience.qr.testResolve"),
                    onClick: onTestResolve,
                    disabled: isTestingResolve || !resolveUrl,
                  },
                ]}
                downloadFileName={`${eventSlug}-${experienceSlug}-qr.svg`}
              />
            ) : (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {t("experience.qr.missingSlugs")}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {!eventSlug && (
            <div className="text-sm text-red-600">
              Missing event slug (uploads to EVENT scope may fail). Event id: {String(exp.event_id)}
            </div>
          )}
          <ExperienceContentForm experience={exp} eventSlug={eventSlug || null} />
        </TabsContent>

        <TabsContent value="localizations" className="space-y-4">
          <ExperienceLocalizationsForm
            experienceId={exp.experience_id ?? Number(id)}
            status={exp.status}
            localizations={expLocs}
          />
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4">
          <ExperienceSponsorsForm experienceId={exp.experience_id ?? Number(id)} sponsors={expSponsors} />
        </TabsContent>

        <TabsContent value="watermark" className="space-y-4">
          <ExperienceWatermarkForm
            key={`${exp.experience_id ?? id}:${exp.watermark_config_id ?? "none"}:${exp.updated_at ?? "na"}`}
            experience={exp}
            eventSlug={eventSlug || null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
