// src/components/admin/experiences/experience-localizations-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/keys";
import { upsertExperienceLocalization } from "@/lib/api/experience-localizations";
import { useI18n } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  experienceId: number | string;
  status: string | null | undefined;

  // backend returns Experience_Localization
  localizations: Array<{ id: number; experience_id: number; language: "EN" | "BG"; display_name: string }>;
};

function getName(list: Props["localizations"], lang: "EN" | "BG") {
  return list.find((x) => x.language === lang)?.display_name ?? "";
}

export function ExperienceLocalizationsForm({ experienceId, status, localizations }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const initialEN = useMemo(() => getName(localizations, "EN"), [localizations]);
  const initialBG = useMemo(() => getName(localizations, "BG"), [localizations]);

  const [enName, setEnName] = useState(initialEN);
  const [bgName, setBgName] = useState(initialBG);

  // ✅ sync state when switching experiences/localizations
  useEffect(() => {
    setEnName(initialEN);
    setBgName(initialBG);
  }, [initialEN, initialBG, experienceId]);

  const isActive = String(status ?? "") === "ACTIVE";
  const dirty = enName.trim() !== initialEN.trim() || bgName.trim() !== initialBG.trim();

  const saveMut = useMutation({
    mutationFn: async () => {
      if (isActive && !enName.trim()) throw new Error(t("experiences.loc.enRequiredForActive"));

      // Swagger only supports PUT (no DELETE) => only send for non-empty values.
      // Clearing input just means “don’t update that localization”.
      const jobs: Array<Promise<any>> = [];
      if (enName.trim()) jobs.push(upsertExperienceLocalization(experienceId, "EN", { display_name: enName.trim() }));
      if (bgName.trim()) jobs.push(upsertExperienceLocalization(experienceId, "BG", { display_name: bgName.trim() }));

      await Promise.all(jobs);
      return true;
    },
    onSuccess: async () => {
      toast.success(t("experiences.loc.saved"));
      await qc.invalidateQueries({ queryKey: qk.experience(experienceId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("experiences.loc.saveFailed")),
  });

  return (
    <div className="rounded border p-4 space-y-4">
      <div className="text-sm font-medium">{t("experiences.tabs.localizations")}</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("experiences.loc.languageEN")}</Label>
          <Input value={enName} onChange={(e) => setEnName(e.target.value)} placeholder="Robot Detective" />
          {isActive && !enName.trim() && (
            <p className="text-xs text-red-600">{t("experiences.loc.enRequiredForActive")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("experiences.loc.putOnlyHint")}</p>
        </div>

        <div className="space-y-1">
          <Label>{t("experiences.loc.languageBG")}</Label>
          <Input value={bgName} onChange={(e) => setBgName(e.target.value)} placeholder="Робот детектив" />
          <p className="text-xs text-muted-foreground">{t("experiences.loc.putOnlyHint")}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">{t("experiences.loc.help")}</div>

        <Button onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
          {saveMut.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
