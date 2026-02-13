// src/app/[lang]/admin/assets/images/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/keys";
import { listImages, type ImageListQuery } from "@/lib/api/images";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/components/i18n-provider";
import { Pagination } from "@/components/admin/pagination";
import { ImageGridCard } from "@/components/admin/images/image-grid-card";

type Scope = "ALL" | "EVENTS" | "SPONSORS" | "GLOBAL";

const SCOPE_FOLDERS: Record<Exclude<Scope, "ALL">, string[]> = {
  EVENTS: ["event", "events"],
  SPONSORS: ["sponsor", "sponsors"],
  GLOBAL: ["global"],
};

export default function ImagesPage() {
  const { lang, t } = useI18n();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("ALL");
  const [mimePrefix, setMimePrefix] = useState("image/");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const query: ImageListQuery = useMemo(
    () => ({
      page,
      pageSize,
      q: q || undefined,
      mime_prefix: mimePrefix || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sortBy: "created_at",
      sortDir: "desc",
    }),
    [page, pageSize, q, mimePrefix, createdFrom, createdTo]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.images({ ...query, scope }),
    queryFn: async () => {
      const res = await listImages(query);
      if (scope === "ALL") return res;

      const allowed = SCOPE_FOLDERS[scope];
      return {
        ...res,
        items: res.items.filter((it) => {
          const firstFolder = it.storage_path.split("/").find(Boolean)?.toLowerCase() ?? "";
          return allowed.includes(firstFolder);
        }),
      };
    },
  });

  function reset() {
    setPage(1);
    setQ("");
    setScope("ALL");
    setMimePrefix("image/");
    setCreatedFrom("");
    setCreatedTo("");
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">{t("images.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("images.search")}</p>
        </div>
      </div>

      <div className="rounded border p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="space-y-1 md:col-span-2">
            <Label>{t("images.search")}</Label>
            <Input value={q} onChange={(e) => (setPage(1), setQ(e.target.value))} placeholder="name / storage_path" />
          </div>

          <div className="space-y-1">
            <Label>{t("images.scope")}</Label>
            <Select value={scope} onValueChange={(v) => (setPage(1), setScope(v as Scope))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="EVENTS">EVENTS</SelectItem>
                <SelectItem value="SPONSORS">SPONSORS</SelectItem>
                <SelectItem value="GLOBAL">GLOBAL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t("images.mime")}</Label>
            <Input value={mimePrefix} onChange={(e) => (setPage(1), setMimePrefix(e.target.value))} />
          </div>

          <div className="space-y-1">
            <Label>{t("images.createdFrom")}</Label>
            <Input
              type="datetime-local"
              value={createdFrom}
              onChange={(e) => (setPage(1), setCreatedFrom(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label>{t("images.createdTo")}</Label>
            <Input
              type="datetime-local"
              value={createdTo}
              onChange={(e) => (setPage(1), setCreatedTo(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={reset}>
            {t("images.reset")}
          </Button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
      {error && (
        <div className="text-sm text-red-600">
          {t("images.loadFailed")}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((img) => (
              <ImageGridCard key={img.image_id} lang={lang} image={img} />
            ))}
          </div>

          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={(p) => setPage(p)}
          />
        </>
      )}
    </div>
  );
}
