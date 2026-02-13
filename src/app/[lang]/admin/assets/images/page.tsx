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
type MimeFilter = "IMAGE_ALL" | "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/svg+xml" | "image/avif";

const SCOPE_FOLDERS: Record<Exclude<Scope, "ALL">, string[]> = {
  EVENTS: ["event", "events"],
  SPONSORS: ["sponsor", "sponsors"],
  GLOBAL: ["global"],
};

const MIME_OPTIONS: Array<{ value: MimeFilter; label: string }> = [
  { value: "IMAGE_ALL", label: "image/*" },
  { value: "image/png", label: "image/png" },
  { value: "image/jpeg", label: "image/jpeg" },
  { value: "image/webp", label: "image/webp" },
  { value: "image/gif", label: "image/gif" },
  { value: "image/svg+xml", label: "image/svg+xml" },
  { value: "image/avif", label: "image/avif" },
];

export default function ImagesPage() {
  const { lang, t } = useI18n();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("ALL");
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>("IMAGE_ALL");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const query: ImageListQuery = useMemo(
    () => ({
      page,
      pageSize,
      q: q || undefined,
      mime_prefix: mimeFilter === "IMAGE_ALL" ? "image/" : undefined,
      mime_type: mimeFilter === "IMAGE_ALL" ? undefined : mimeFilter,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      sortBy: "created_at",
      sortDir: "desc",
    }),
    [page, pageSize, q, mimeFilter, createdFrom, createdTo]
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
    setMimeFilter("IMAGE_ALL");
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
            <Select value={mimeFilter} onValueChange={(v) => (setPage(1), setMimeFilter(v as MimeFilter))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MIME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
