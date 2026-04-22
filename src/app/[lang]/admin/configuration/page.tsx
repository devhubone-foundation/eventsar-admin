"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getVersionConfig, upsertVersionConfig } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/keys";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (typeof error.details === "string" && error.details.trim()) return error.details;

    if (error.details && typeof error.details === "object") {
      const message = (error.details as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
      if (Array.isArray(message)) {
        const firstMessage = message.find((item) => typeof item === "string" && item.trim());
        if (typeof firstMessage === "string") return firstMessage;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export default function ConfigurationPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: qk.versionConfig(),
    queryFn: getVersionConfig,
  });

  const value = draftValue ?? configQuery.data?.value ?? "";
  const note = draftNote ?? configQuery.data?.note ?? "";

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertVersionConfig({
        value,
        note,
      }),
    onSuccess: async (saved) => {
      setDraftValue(saved.value ?? "");
      setDraftNote(saved.note ?? "");
      toast.success(t("config.saved"));
      await qc.invalidateQueries({ queryKey: qk.versionConfig() });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t("config.saveFailed")));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{t("config.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("config.subtitle")}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("config.versionCardTitle")}</CardTitle>
          <CardDescription>{t("config.versionCardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : null}

          {configQuery.error ? (
            <div className="text-sm text-red-600">{t("config.loadFailed")}</div>
          ) : null}

          {!configQuery.isLoading && !configQuery.error ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="config-key">{t("config.keyLabel")}</Label>
                <Input id="config-key" value={configQuery.data?.key ?? "version"} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="config-value">{t("config.valueLabel")}</Label>
                <Input
                  id="config-value"
                  value={value}
                  onChange={(e) => setDraftValue(e.target.value)}
                  placeholder={t("config.valuePlaceholder")}
                  disabled={saveMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">{t("config.valueHelp")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="config-note">{t("config.noteLabel")}</Label>
                <Textarea
                  id="config-note"
                  value={note}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder={t("config.notePlaceholder")}
                  rows={4}
                  disabled={saveMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">{t("config.noteHelp")}</p>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
