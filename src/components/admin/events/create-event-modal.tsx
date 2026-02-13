// src/components/admin/events/create-event-modal.tsx
"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createEvent, listEvents } from "@/lib/api/events";
import { useI18n } from "@/components/i18n-provider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  slug: z
    .string()
    .min(1, "slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase kebab-case"),
});

type Values = z.infer<typeof schema>;

export function CreateEventModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { slug: "" },
  });

  const mut = useMutation({
    mutationFn: async (v: Values) => {
      setServerError(null);

      // ✅ best-effort uniqueness check
      const res = await listEvents({ page: 1, pageSize: 50, q: v.slug });
      const items = res?.items ?? [];
      const clash = items.find((it: any) => String(it.slug) === v.slug);
      if (clash) {
        throw new Error(`Slug already exists: ${v.slug}`);
      }

      return createEvent({ slug: v.slug, status: "DRAFT" });
    },
    onSuccess: (created) => {
      toast.success(t("events.created"));
      onOpenChange(false);

      const id = created?.event_id ?? created?.id ?? created?.eventId;
      if (id) router.push(`/${lang}/admin/events/${id}`);
      else router.push(`/${lang}/admin/events`);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("events.createFailed");
      setServerError(msg);
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("events.create")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mut.mutate(v))}>
          <div className="space-y-1">
            <Label>{t("events.slug")}</Label>
            <Input {...form.register("slug")} placeholder="sofia-tech-expo-2026" />
            {form.formState.errors.slug && (
              <p className="text-sm text-red-600">{form.formState.errors.slug.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600 whitespace-pre-wrap">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? t("events.creating") : t("events.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
