"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { useMetaEnums } from "@/lib/meta/use-meta";
import { useI18n } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadModelModal } from "@/components/admin/upload/upload-model-modal";

type ModelRow = {
  model_id: number;
  name: string;
  type: string;
  version: number;
  storage_path: string;
};

async function listModels(q?: string, type?: string) {
  const sp = new URLSearchParams();
  sp.set("page", "1");
  sp.set("pageSize", "50");
  if (q) sp.set("q", q);
  if (type) sp.set("type", type);
  sp.set("sortBy", "created_at");
  sp.set("sortDir", "desc");
  return apiClient<{ items: ModelRow[] }>(`/api/admin/models?${sp.toString()}`);
}

const TYPE_ALL = "__ALL__"; // sentinel (SelectItem value must not be "")

export function ModelPicker({
                              value,
                              onChange,
                              uploadDefaults,
                            }: {
  value: number | null;
  onChange: (id: number | null) => void;
  uploadDefaults: { eventSlug: string };
}) {
  const { t } = useI18n();
  const meta = useMetaEnums();

  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>(TYPE_ALL);

  // Filter out any accidental empty enum values from backend
  const modelTypes = (meta.enums.Model_Type ?? []).filter((x) => typeof x === "string" && x.trim().length > 0);

  const effectiveType = type === TYPE_ALL ? undefined : type;

  const { data } = useQuery({
    queryKey: ["modelsForPicker", q, effectiveType],
    queryFn: () => listModels(q, effectiveType),
    enabled: open, // only fetch when the dialog is open (optional, but nicer)
  });

  const items = data?.items ?? [];
  const selected = useMemo(() => items.find((m) => m.model_id === value) ?? null, [items, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {value ? `Model #${value}` : t("picker.select") ?? "Select model"}
        </Button>

        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            {t("picker.clear") ?? "Clear"}
          </Button>
        )}

        <Button type="button" onClick={() => setUploadOpen(true)}>
          {t("picker.uploadNew") ?? "Upload new"}
        </Button>
      </div>

      {selected && (
        <div className="text-xs text-muted-foreground">
          {selected.name} (v{selected.version}) — {selected.type}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("picker.select") ?? "Select model"}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 flex-wrap">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("models.searchPlaceholder") ?? "Search name or path"}
              className="max-w-xs"
            />

            <Select
              value={type}
              onValueChange={(v) => setType(v)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t("models.typeAll") ?? "Type (all)"} />
              </SelectTrigger>
              <SelectContent>
                {/* IMPORTANT: no empty-string value */}
                <SelectItem value={TYPE_ALL}>{t("common.all") ?? "All"}</SelectItem>

                {modelTypes.map((mt) => (
                  <SelectItem key={mt} value={mt}>
                    {meta.enumLabel("Model_Type", mt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Version</th>
                <th className="p-3 text-left">Path</th>
                <th className="p-3"></th>
              </tr>
              </thead>
              <tbody>
              {items.map((m) => (
                <tr key={m.model_id} className="border-t">
                  <td className="p-3">{m.name}</td>
                  <td className="p-3">{m.type}</td>
                  <td className="p-3">{m.version}</td>
                  <td className="p-3 font-mono text-xs">{m.storage_path}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        onChange(m.model_id);
                        setOpen(false);
                      }}
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    No models found
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <UploadModelModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultEventSlug={uploadDefaults.eventSlug}
        onUploaded={(modelId) => {
          onChange(modelId);
          setUploadOpen(false);
        }}
      />
    </div>
  );
}
