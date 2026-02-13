"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patchEvent, patchEventStatus } from "@/lib/api/events";
import { qk } from "@/lib/api/keys";
import { useI18n } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMetaEnums } from "@/lib/meta/use-meta";

// ✅ helper: empty string -> undefined, otherwise number
const numOptional = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

const urlOptional = z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional());
const emailOptional = z.preprocess((v) => (v === "" ? undefined : v), z.string().email().optional());
const strOptional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  code: strOptional,
  timezone: strOptional,
  website_url: urlOptional,
  support_url: urlOptional,
  contact_email: emailOptional,
  contact_phone: strOptional,

  environment: strOptional,
  start_at: strOptional, // ISO or empty
  end_at: strOptional,   // ISO or empty

  about_url: urlOptional,
  rules_url: urlOptional,
  terms_url: urlOptional,

  lat: numOptional,
  lng: numOptional,

  status: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function EventOverviewForm({ event }: { event: any }) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const meta = useMetaEnums();
  const eventStatuses = meta.enums.Event_Status ?? [];
  const envTypes = meta.enums.Environment_Type ?? [];


  const eventId = String(event.event_id ?? event.id);
  const originalStatus = useMemo(() => String(event.status ?? "DRAFT"), [event.status]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: event.code ?? "",
      timezone: event.timezone ?? "",
      website_url: event.website_url ?? "",
      support_url: event.support_url ?? "",
      contact_email: event.contact_email ?? "",
      contact_phone: event.contact_phone ?? "",
      environment: event.environment ?? "",
      start_at: event.start_at ?? "",
      end_at: event.end_at ?? "",
      about_url: event.about_url ?? "",
      rules_url: event.rules_url ?? "",
      terms_url: event.terms_url ?? "",
      lat: event.lat ?? undefined,
      lng: event.lng ?? undefined,
      status: event.status ?? "DRAFT",
    },
  });

  const saveMetaMut = useMutation({
    mutationFn: async (v: FormValues) =>
      patchEvent(eventId, {
        code: v.code ?? null,
        timezone: v.timezone ?? null,
        website_url: v.website_url ?? null,
        support_url: v.support_url ?? null,
        contact_email: v.contact_email ?? null,
        contact_phone: v.contact_phone ?? null,
        environment: v.environment ?? null,
        start_at: v.start_at ?? null,
        end_at: v.end_at ?? null,
        about_url: v.about_url ?? null,
        rules_url: v.rules_url ?? null,
        terms_url: v.terms_url ?? null,
        lat: typeof v.lat === "number" ? v.lat : null,
        lng: typeof v.lng === "number" ? v.lng : null,
      }),
    onSuccess: async () => {
      toast.success(t("events.saved"));
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
      await qc.invalidateQueries({ queryKey: qk.events(undefined) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("events.saveFailed")),
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) => patchEventStatus(eventId, { status }),
    onSuccess: async () => {
      toast.success(t("events.saved"));
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
      await qc.invalidateQueries({ queryKey: qk.events(undefined) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("events.saveFailed")),
  });

  const onSubmit: SubmitHandler<FormValues> = (v) => {
    saveMetaMut.mutate(v);
    if (v.status && v.status !== originalStatus) {
      if (v.status === "ACTIVE") {
        const locs: any[] = Array.isArray(event.localizations) ? event.localizations : [];
        const en = locs.find((l) => String(l.language).toUpperCase() === "EN");
        const enName = en?.name ? String(en.name).trim() : "";
        if (!enName) {
          toast.error(t("event.loc.enRequiredForActive"));
          // revert UI back to original status so it’s not misleading
          form.setValue("status", originalStatus);
          return;
        }
      }
      statusMut.mutate(v.status);
    }

  };

  const ENV_NONE = "__NONE__";

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Label>Slug</Label>
        <Input value={String(event.slug ?? "")} readOnly className="bg-muted" />
        <p className="text-xs text-muted-foreground">Slug is immutable after creation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Code</Label>
          <Input {...form.register("code")} placeholder="SOFIA2026" />
        </div>

        <div className="space-y-1">
          <Label>Timezone</Label>
          <Input {...form.register("timezone")} placeholder="Europe/Sofia" />
        </div>

        <div className="space-y-1">
          <Label>Website URL</Label>
          <Input {...form.register("website_url")} placeholder="https://event.com" />
          {form.formState.errors.website_url && (
            <p className="text-xs text-red-600">{String(form.formState.errors.website_url.message)}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Support URL</Label>
          <Input {...form.register("support_url")} placeholder="https://event.com/support" />
          {form.formState.errors.support_url && (
            <p className="text-xs text-red-600">{String(form.formState.errors.support_url.message)}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Contact email</Label>
          <Input {...form.register("contact_email")} placeholder="support@event.com" />
          {form.formState.errors.contact_email && (
            <p className="text-xs text-red-600">{String(form.formState.errors.contact_email.message)}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Contact phone</Label>
          <Input {...form.register("contact_phone")} placeholder="+359..." />
        </div>

        <div className="space-y-1">
          <Label>Environment</Label>
          <Select
            value={form.watch("environment") || ENV_NONE}
            onValueChange={(v) => form.setValue("environment", v === ENV_NONE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="(none)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ENV_NONE}>(none)</SelectItem>
              {envTypes.map((e) => (
                <SelectItem key={e} value={e}>
                  {meta.enumLabel("Environment_Type", e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {eventStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {meta.enumLabel("Event_Status", s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        <div className="space-y-1">
          <Label>Start at (ISO)</Label>
          <Input {...form.register("start_at")} placeholder="2026-02-15T10:00:00.000Z" />
        </div>

        <div className="space-y-1">
          <Label>End at (ISO)</Label>
          <Input {...form.register("end_at")} placeholder="2026-02-15T18:00:00.000Z" />
        </div>

        <div className="space-y-1">
          <Label>About URL</Label>
          <Input {...form.register("about_url")} placeholder="https://event.com/about" />
          {form.formState.errors.about_url && (
            <p className="text-xs text-red-600">{String(form.formState.errors.about_url.message)}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Rules URL</Label>
          <Input {...form.register("rules_url")} placeholder="https://event.com/rules" />
          {form.formState.errors.rules_url && (
            <p className="text-xs text-red-600">{String(form.formState.errors.rules_url.message)}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Terms URL</Label>
          <Input {...form.register("terms_url")} placeholder="https://event.com/terms" />
          {form.formState.errors.terms_url && (
            <p className="text-xs text-red-600">{String(form.formState.errors.terms_url.message)}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Lat</Label>
          <Input type="number" step="0.0001" {...form.register("lat")} />
        </div>

        <div className="space-y-1">
          <Label>Lng</Label>
          <Input type="number" step="0.0001" {...form.register("lng")} />
        </div>
      </div>

      <Button type="submit" disabled={saveMetaMut.isPending || statusMut.isPending}>
        {saveMetaMut.isPending || statusMut.isPending ? t("events.saving") : t("events.save")}
      </Button>
    </form>
  );
}
