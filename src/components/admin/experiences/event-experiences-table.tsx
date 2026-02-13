// src/components/admin/experiences/event-experiences-table.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderEventExperiences } from "@/lib/api/experiences";
import { qk } from "@/lib/api/keys";
import { arrayMove } from "@/components/admin/dnd/reorder";
import { getStorageUrl } from "@/lib/storage";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

type Row = {
  experience_id: number;
  slug: string;
  type: string;
  status: string;
  sort_order: number;
  thumbnail_image?: { storage_path: string } | null;
  localizations?: Array<{ language: "EN" | "BG"; display_name: string }>;
};

function displayName(row: Row, lang: "EN" | "BG") {
  const locs = row.localizations ?? [];
  const want = locs.find((l) => l.language === lang)?.display_name;
  const fallback = locs.find((l) => l.language === "EN")?.display_name;
  return want ?? fallback ?? row.slug;
}

export function EventExperiencesTable({
                                        eventId,
                                        initialItems,
                                      }: {
  eventId: string;
  initialItems: Row[];
}) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  // sort by sort_order asc
  const base = useMemo(
    () => [...initialItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [initialItems]
  );

  const [items, setItems] = useState<Row[]>(base);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // ✅ keep UI in sync with refetches
  useEffect(() => {
    setItems(base);
  }, [base]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = items.map((it, idx) => ({ experience_id: it.experience_id, sort_order: idx }));
      return reorderEventExperiences(eventId, payload);
    },
    onSuccess: async () => {
      toast.success(t("experiences.orderSaved"));
      await qc.invalidateQueries({ queryKey: qk.eventExperiences(eventId) });
      // also invalidate the param-keyed list if you’re using it
      await qc.invalidateQueries({ queryKey: qk.experiences(eventId, { page: 1, pageSize: 50, sortBy: "sort_order", sortDir: "asc" }) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("experiences.orderSaveFailed")),
  });

  const uiLang = lang.toUpperCase() === "BG" ? "BG" : "EN";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">{t("experiences.reorderHelp")}</div>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? t("experiences.savingOrder") : t("experiences.saveOrder")}
        </Button>
      </div>

      <div className="rounded border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3 w-[56px]"></th>
            <th className="p-3">Name</th>
            <th className="p-3">Slug</th>
            <th className="p-3">Type</th>
            <th className="p-3">Status</th>
            <th className="p-3">Order</th>
            <th className="p-3"></th>
          </tr>
          </thead>

          <tbody>
          {items.map((row, idx) => {
            const thumb = row.thumbnail_image?.storage_path;
            return (
              <tr
                key={row.experience_id}
                className="border-t"
                draggable
                onDragStart={() => setDragFrom(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom === null) return;
                  if (dragFrom === idx) return;
                  setItems((prev) => arrayMove(prev, dragFrom, idx));
                  setDragFrom(null);
                }}
              >
                <td className="p-3 text-muted-foreground cursor-grab select-none">⋮⋮</td>

                <td className="p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {thumb ? (
                      <img
                        src={getStorageUrl(thumb)}
                        className="h-10 w-14 object-cover rounded border"
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-14 rounded border bg-muted" />
                    )}
                    <div className="truncate font-medium">
                      {displayName(row, uiLang)}
                    </div>
                  </div>
                </td>

                <td className="p-3">{row.slug}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3">{row.status}</td>
                <td className="p-3">{idx}</td>
                <td className="p-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${lang}/admin/experiences/${row.experience_id}`}>
                      {t("experiences.open")}
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
