// src/components/admin/events/event-localizations-panel.tsx
"use client";

import { z } from "zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { putEventLocalization } from "@/lib/api/events";
import { qk } from "@/lib/api/keys";
import { useI18n } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const baseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  venue_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});
type FormValues = z.infer<typeof baseSchema>;

function pickLoc(event: any, lang: "EN" | "BG") {
  const locs: any[] = Array.isArray(event.localizations) ? event.localizations : [];
  const found = locs.find((l) => String(l.language).toUpperCase() === lang);
  return found ?? null;
}

function toPayload(v: FormValues) {
  return {
    name: v.name.trim(),
    description: v.description?.trim() ? v.description.trim() : null,
    venue_name: v.venue_name?.trim() ? v.venue_name.trim() : null,
    address: v.address?.trim() ? v.address.trim() : null,
    city: v.city?.trim() ? v.city.trim() : null,
    country: v.country?.trim() ? v.country.trim() : null,
  };
}

export function EventLocalizationsPanel({ event }: { event: any }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const eventId = String(event.event_id ?? event.id);

  const en = useMemo(() => pickLoc(event, "EN"), [event]);
  const bg = useMemo(() => pickLoc(event, "BG"), [event]);

  // EN form (name required)
  const enForm = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: en?.name ?? "",
      description: en?.description ?? "",
      venue_name: en?.venue_name ?? "",
      address: en?.address ?? "",
      city: en?.city ?? "",
      country: en?.country ?? "",
    },
  });

  // BG form (name optional in UX, but backend might require; we allow empty and block client-side save)
  const bgSchema = baseSchema.extend({
    name: z.string().optional(),
  });
  type BGValues = z.infer<typeof bgSchema>;

  const bgForm = useForm<BGValues>({
    resolver: zodResolver(bgSchema),
    defaultValues: {
      name: bg?.name ?? "",
      description: bg?.description ?? "",
      venue_name: bg?.venue_name ?? "",
      address: bg?.address ?? "",
      city: bg?.city ?? "",
      country: bg?.country ?? "",
    },
  });

  const saveMut = useMutation({
    mutationFn: async (args: { lang: "EN" | "BG"; values: any }) => {
      if (args.lang === "BG" && (!args.values.name || !String(args.values.name).trim())) {
        // BG can be skipped; treat as no-op save
        throw new Error("BG name is empty (skip saving BG or add a name)");
      }
      return putEventLocalization(eventId, args.lang, toPayload(args.values));
    },
    onSuccess: async () => {
      toast.success(t("event.loc.saved"));
      await qc.invalidateQueries({ queryKey: qk.event(eventId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("event.loc.saveFailed")),
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="EN">
        <TabsList>
          <TabsTrigger value="EN">{t("event.loc.languageEN")}</TabsTrigger>
          <TabsTrigger value="BG">{t("event.loc.languageBG")}</TabsTrigger>
        </TabsList>

        <TabsContent value="EN" className="pt-4">
          <form
            className="space-y-4"
            onSubmit={enForm.handleSubmit((v) => saveMut.mutate({ lang: "EN", values: v }))}
          >
            <div className="space-y-1">
              <Label>{t("event.loc.name")}</Label>
              <Input {...enForm.register("name")} />
              {enForm.formState.errors.name && (
                <p className="text-sm text-red-600">{String(enForm.formState.errors.name.message)}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>{t("event.loc.description")}</Label>
              <Input {...enForm.register("description")} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("event.loc.venue_name")}</Label>
                <Input {...enForm.register("venue_name")} />
              </div>
              <div className="space-y-1">
                <Label>{t("event.loc.address")}</Label>
                <Input {...enForm.register("address")} />
              </div>
              <div className="space-y-1">
                <Label>{t("event.loc.city")}</Label>
                <Input {...enForm.register("city")} />
              </div>
              <div className="space-y-1">
                <Label>{t("event.loc.country")}</Label>
                <Input {...enForm.register("country")} />
              </div>
            </div>

            <Button type="submit" disabled={saveMut.isPending}>
              {t("event.loc.save")}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="BG" className="pt-4">
          <form
            className="space-y-4"
            onSubmit={bgForm.handleSubmit((v) => saveMut.mutate({ lang: "BG", values: v }))}
          >
            <div className="space-y-1">
              <Label>{t("event.loc.name")}</Label>
              <Input {...bgForm.register("name")} />
              <p className="text-xs text-muted-foreground">
                (Required) You need to fill both Bulgarian and English localizations for the app to work correctly.
              </p>
            </div>

            <div className="space-y-1">
              <Label>{t("event.loc.description")}</Label>
              <Input {...bgForm.register("description")} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("event.loc.venue_name")}</Label>
                <Input {...bgForm.register("venue_name")} />
              </div>
              <div className="space-y-1">
                <Label>{t("event.loc.address")}</Label>
                <Input {...bgForm.register("address")} />
              </div>
              <div className="space-y-1">
                <Label>{t("event.loc.city")}</Label>
                <Input {...bgForm.register("city")} />
              </div>
              <div className="space-y-1">
                <Label>{t("event.loc.country")}</Label>
                <Input {...bgForm.register("country")} />
              </div>
            </div>

            <Button type="submit" disabled={saveMut.isPending || !String(bgForm.watch("name") ?? "").trim()}>
              {t("event.loc.save")}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
