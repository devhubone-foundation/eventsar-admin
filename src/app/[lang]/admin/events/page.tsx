// src/app/[lang]/admin/events/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { qk } from "@/lib/api/keys";
import { listEvents } from "@/lib/api/events";
import { useI18n } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateEventModal } from "@/components/admin/events/create-event-modal";

export default function EventsPage() {
  const { lang, t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: qk.events({ q }),
    queryFn: () => listEvents({ page: 1, pageSize: 30, q: q || undefined }),
  });

  const items: any[] = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">{t("events.title")}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>{t("events.create")}</Button>
      </div>

      <div className="rounded border p-4">
        <div className="space-y-1 max-w-md">
          <Label>{t("images.search")}</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="slug / name" />
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
      {error && <div className="text-sm text-red-600">{t("events.loadFailed")}</div>}

      <div className="rounded border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">ID</th>
            <th className="p-3">{t("events.slug")}</th>
            <th className="p-3">{t("events.status")}</th>
            <th className="p-3"></th>
          </tr>
          </thead>
          <tbody>
          {items.map((ev) => {
            const id = ev.event_id ?? ev.id;
            return (
              <tr key={String(id)} className="border-t">
                <td className="p-3">{id}</td>
                <td className="p-3">{ev.slug}</td>
                <td className="p-3">{ev.status}</td>
                <td className="p-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${lang}/admin/events/${id}`}>{t("events.open")}</Link>
                  </Button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
