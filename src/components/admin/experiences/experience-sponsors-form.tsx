// src/components/admin/experiences/experience-sponsors-form.tsx
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import {
  addExperienceSponsor,
  deleteExperienceSponsor,
  patchExperienceSponsor,
  type ExperienceSponsorRow,
} from "@/lib/api/experience-sponsors";
import { getStorageUrl } from "@/lib/storage";

import { useI18n } from "@/components/i18n-provider";
import { SponsorPicker, type SponsorPickerValue } from "@/components/admin/sponsors/sponsor-picker";
import { WatermarkEditor, type WatermarkValue } from "@/components/admin/watermark/watermark-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  experienceId: number | string;
  // comes from getExperience response (may differ; we normalize defensively)
  sponsors: ExperienceSponsorRow[];
};

function toWatermarkValue(raw: any | null | undefined): WatermarkValue {
  if (!raw) return { position: "bottom_right", scale: 1, opacity: 1 };

  const image_id = raw.image_id ?? raw.image?.image_id ?? undefined;
  return {
    image_id,
    position: raw.position ?? "bottom_right",
    scale: typeof raw.scale === "number" ? raw.scale : 1,
    opacity: typeof raw.opacity === "number" ? raw.opacity : 1,
  };
}

export function ExperienceSponsorsForm({ experienceId, sponsors }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [picker, setPicker] = useState<SponsorPickerValue>(null);

  const addMut = useMutation({
    mutationFn: async () => {
      if (!picker?.sponsor_id) throw new Error(t("experiences.sponsors.pickRequired"));

      // default sort_order at end
      const nextOrder = sponsors.length;

      return addExperienceSponsor(experienceId, {
        sponsor_id: picker.sponsor_id,
        sort_order: nextOrder,
        is_primary: false,
      });
    },
    onSuccess: async () => {
      toast.success(t("experiences.sponsors.added"));
      setPicker(null);
      await qc.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          // Adjust if your qk.experience shape differs, but usually it's ["experience", id]
          return Array.isArray(key) && key[0] === "experience";
        },
      });

    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("experiences.sponsors.addFailed")),
  });

  const rows = useMemo(() => {
    // stable ordering by sort_order then id
    return [...(sponsors ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.experience_sponsor_id - b.experience_sponsor_id
    );
  }, [sponsors]);

  return (
    <div className="space-y-4">
      <div className="rounded border p-4 space-y-3">
        <div className="text-sm font-medium">{t("experiences.sponsors.title")}</div>

        <SponsorPicker value={picker} onChange={setPicker} />

        <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !picker?.sponsor_id}>
          {addMut.isPending ? t("common.saving") : t("experiences.sponsors.add")}
        </Button>

        <div className="text-xs text-muted-foreground">{t("experiences.sponsors.primaryHint")}</div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t("experiences.sponsors.none")}</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <ExperienceSponsorRowCard
              key={row.experience_sponsor_id}
              experienceId={experienceId}
              row={row}
              allRows={rows}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExperienceSponsorRowCard({
                                    experienceId,
                                    row,
                                    allRows,
                                  }: {
  experienceId: number | string;
  row: ExperienceSponsorRow;
  allRows: ExperienceSponsorRow[];
}) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const sponsorName = row.sponsor?.name ?? `#${row.sponsor_id}`;
  const logoPath = row.sponsor?.logo_image?.storage_path ?? null;

  const [order, setOrder] = useState<number>(row.sort_order ?? 0);
  const [primary, setPrimary] = useState<boolean>(Boolean(row.is_primary));

  const [wmEnabled, setWmEnabled] = useState<boolean>(Boolean(row.watermark && (row.watermark.image_id || row.watermark.image?.image_id)));
  const [wm, setWm] = useState<WatermarkValue>(() => toWatermarkValue(row.watermark));

  // IMPORTANT: backend doesn't enforce uniqueness for is_primary.
  // When we set a sponsor primary, we also unset others client-side.
  const saveMut = useMutation({
    mutationFn: async () => {
      const jobs: Array<Promise<any>> = [];

      // If setting this primary => unset others
      if (primary) {
        for (const r of allRows) {
          if (r.experience_sponsor_id !== row.experience_sponsor_id && r.is_primary) {
            jobs.push(patchExperienceSponsor(experienceId, r.experience_sponsor_id, { is_primary: false }));
          }
        }
      }

      jobs.push(
        patchExperienceSponsor(experienceId, row.experience_sponsor_id, {
          sort_order: Number.isFinite(order) ? order : 0,
          is_primary: primary,
          watermark: wmEnabled && wm.image_id
            ? { image_id: wm.image_id, position: wm.position, scale: wm.scale, opacity: wm.opacity }
            : undefined,
          // we are not setting watermark_config_id here; if you want “reuse existing config”
          // add a selector later.
        })
      );

      await Promise.all(jobs);
      return true;
    },
    onSuccess: async () => {
      toast.success(t("common.saved"));
      await qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "experience",
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.saveFailed")),
  });

  const delMut = useMutation({
    mutationFn: async () => deleteExperienceSponsor(experienceId, row.experience_sponsor_id),
    onSuccess: async () => {
      toast.success(t("experiences.sponsors.removed"));
      await qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "experience",
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("experiences.sponsors.removeFailed")),
  });

  return (
    <div className="rounded border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {logoPath ? (
            <img src={getStorageUrl(logoPath)} alt={sponsorName} className="h-12 w-12 rounded border object-cover" />
          ) : (
            <div className="h-12 w-12 rounded border bg-muted" />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{sponsorName}</div>
            <div className="text-xs text-muted-foreground">#{row.sponsor_id}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? t("common.saving") : t("common.save")}
          </Button>
          <Button variant="destructive" onClick={() => delMut.mutate()} disabled={delMut.isPending}>
            {t("experiences.sponsors.remove")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>{t("experiences.sponsors.sortOrder")}</Label>
          <Input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("experiences.sponsors.primary")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={primary}
              onChange={(e) => setPrimary(e.target.checked)}
            />
            <span className="text-sm">{primary ? t("common.yes") : t("common.no")}</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label>{t("experiences.sponsors.watermark")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={wmEnabled}
              onChange={(e) => setWmEnabled(e.target.checked)}
            />
            <span className="text-sm">{wmEnabled ? t("common.enabled") : t("common.disabled")}</span>
          </div>
        </div>
      </div>

      {wmEnabled && (
        <WatermarkEditor
          value={wm}
          onChange={setWm}
          allowedScopesForImage={["SPONSOR", "GLOBAL", "EVENT"]}
        />
      )}
    </div>
  );
}
