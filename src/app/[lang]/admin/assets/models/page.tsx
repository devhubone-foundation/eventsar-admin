// src/app/[lang]/admin/assets/models/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/keys";
import { listModels, type ModelListQuery } from "@/lib/api/models";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";
import { Pagination } from "@/components/admin/pagination";
import { ModelTable } from "@/components/admin/models/model-table";

type ModelType = "ALL" | "WORLD_AR" | "FACE" | "IMAGE_TRACKING";

function typeLabel(t: (k: string) => string, v: ModelType) {
  // translate label, keep raw value
  const map: Record<ModelType, string> = {
    ALL: "ALL",
    WORLD_AR: "WORLD_AR",
    FACE: "FACE",
    IMAGE_TRACKING: "IMAGE_TRACKING",
  };
  return map[v];
}

export default function ModelsPage() {
  const { t } = useI18n();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [q, setQ] = useState("");
  const [type, setType] = useState<ModelType>("ALL");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const query: ModelListQuery = useMemo(
    () => ({
      page,
      pageSize,
      q: q || undefined,
      type: type === "ALL" ? undefined : type,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sortBy: "created_at",
      sortDir: "desc",
    }),
    [page, pageSize, q, type, createdFrom, createdTo]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.models(query),
    queryFn: () => listModels(query),
  });

  function reset() {
    setPage(1);
    setQ("");
    setType("ALL");
    setCreatedFrom("");
    setCreatedTo("");
    refetch();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{t("models.title")}</h1>
      </div>

      <div className="rounded border p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1 md:col-span-2">
            <Label>{t("models.search")}</Label>
            <Input value={q} onChange={(e) => (setPage(1), setQ(e.target.value))} placeholder="name / storage_path" />
          </div>

          <div className="space-y-1">
            <Label>{t("models.type")}</Label>
            <Select value={type} onValueChange={(v) => (setPage(1), setType(v as ModelType))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{typeLabel(t, "ALL")}</SelectItem>
                <SelectItem value="WORLD_AR">{typeLabel(t, "WORLD_AR")}</SelectItem>
                <SelectItem value="FACE">{typeLabel(t, "FACE")}</SelectItem>
                <SelectItem value="IMAGE_TRACKING">{typeLabel(t, "IMAGE_TRACKING")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t("models.createdFrom")}</Label>
            <Input type="datetime-local" value={createdFrom} onChange={(e) => (setPage(1), setCreatedFrom(e.target.value))} />
          </div>

          <div className="space-y-1">
            <Label>{t("models.createdTo")}</Label>
            <Input type="datetime-local" value={createdTo} onChange={(e) => (setPage(1), setCreatedTo(e.target.value))} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={reset}>
            {t("models.reset")}
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
      {error && <div className="text-sm text-red-600">{t("models.loadFailed")}</div>}

      {data && (
        <>
          <ModelTable items={data.items} />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setPage(p)} />
        </>
      )}
    </div>
  );
}
