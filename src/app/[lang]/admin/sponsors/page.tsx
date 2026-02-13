"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useI18n } from "@/components/i18n-provider";
import { qk } from "@/lib/api/keys";
import { listSponsors, type SponsorListQuery } from "@/lib/api/sponsors";
import { getStorageUrl } from "@/lib/storage";
import { Pagination } from "@/components/admin/pagination";
import { GlobalSponsorCreateModal } from "@/components/admin/sponsors/global-sponsor-create-modal";
import { GlobalSponsorEditModal } from "@/components/admin/sponsors/global-sponsor-edit-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SponsorRow = {
  sponsor_id: number;
  name: string;
  website_url: string | null;
  created_at: string | null;
  logo_storage_path: string | null;
};

type SponsorListResult = {
  page: number;
  pageSize: number;
  total: number;
  items: SponsorRow[];
};

function pickFromRecord(raw: unknown, key: string): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as Record<string, unknown>)[key];
}

function toSponsorRow(raw: unknown): SponsorRow | null {
  const sponsorId =
    typeof pickFromRecord(raw, "sponsor_id") === "number"
      ? (pickFromRecord(raw, "sponsor_id") as number)
      : typeof pickFromRecord(raw, "id") === "number"
        ? (pickFromRecord(raw, "id") as number)
        : null;

  if (!sponsorId) return null;

  const logoImage = pickFromRecord(raw, "logo_image");
  const logoObj = pickFromRecord(raw, "logo");

  const logoStoragePath =
    (logoImage && typeof logoImage === "object" ? (logoImage as Record<string, unknown>).storage_path : undefined) ??
    (logoObj && typeof logoObj === "object" ? (logoObj as Record<string, unknown>).storage_path : undefined) ??
    pickFromRecord(raw, "logo_storage_path") ??
    null;

  return {
    sponsor_id: sponsorId,
    name: String(pickFromRecord(raw, "name") ?? ""),
    website_url: (pickFromRecord(raw, "website_url") as string | null | undefined) ?? null,
    created_at: (pickFromRecord(raw, "created_at") as string | null | undefined) ?? null,
    logo_storage_path: typeof logoStoragePath === "string" ? logoStoragePath : null,
  };
}

function normalizeListResponse(raw: unknown, fallbackPage: number, fallbackPageSize: number): SponsorListResult {
  const rawItems = Array.isArray(raw)
    ? raw
    : Array.isArray(pickFromRecord(raw, "items"))
      ? (pickFromRecord(raw, "items") as unknown[])
      : [];
  const items = rawItems.map(toSponsorRow).filter((x): x is SponsorRow => Boolean(x));

  return {
    page: typeof pickFromRecord(raw, "page") === "number" ? (pickFromRecord(raw, "page") as number) : fallbackPage,
    pageSize:
      typeof pickFromRecord(raw, "pageSize") === "number"
        ? (pickFromRecord(raw, "pageSize") as number)
        : fallbackPageSize,
    total: typeof pickFromRecord(raw, "total") === "number" ? (pickFromRecord(raw, "total") as number) : items.length,
    items,
  };
}

export default function SponsorsPage() {
  const { t } = useI18n();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const sortBy: SponsorListQuery["sortBy"] = "created_at";
  const sortDir: SponsorListQuery["sortDir"] = "desc";

  const query = useMemo<SponsorListQuery>(
    () => ({
      page,
      pageSize,
      q: q || undefined,
      sortBy,
      sortDir,
    }),
    [page, pageSize, q, sortBy, sortDir]
  );

  const listQ = useQuery({
    queryKey: qk.sponsors(query),
    queryFn: () => listSponsors(query),
  });

  const data = useMemo(
    () => normalizeListResponse(listQ.data, page, pageSize),
    [listQ.data, page, pageSize]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">{t("nav.sponsors")}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>{t("sponsorPicker.createNew")}</Button>
      </div>

      <div className="rounded border p-4">
        <form
          className="flex items-end gap-2 flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQ(qInput.trim());
          }}
        >
          <div className="space-y-1 min-w-[280px]">
            <Label>{t("images.search")}</Label>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={t("sponsorPicker.searchPlaceholder")}
            />
          </div>
          <Button type="submit">{t("images.search")}</Button>
        </form>
      </div>

      {listQ.isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
      {listQ.error && <div className="text-sm text-red-600">{t("sponsorCreate.failed")}</div>}

      <div className="rounded border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Logo</th>
              <th className="p-3">{t("sponsorCreate.name")}</th>
              <th className="p-3">{t("sponsorCreate.website")}</th>
              <th className="p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((sponsor) => (
              <tr key={sponsor.sponsor_id} className="border-t">
                <td className="p-3">
                  {sponsor.logo_storage_path ? (
                    <img
                      src={getStorageUrl(sponsor.logo_storage_path)}
                      alt={sponsor.name}
                      className="h-10 w-10 rounded border object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded border bg-muted" />
                  )}
                </td>
                <td className="p-3">{sponsor.name}</td>
                <td className="p-3 max-w-[360px] truncate" title={sponsor.website_url ?? undefined}>
                  {sponsor.website_url ? (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      {sponsor.website_url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-3">
                  {sponsor.created_at ? new Date(sponsor.created_at).toLocaleString() : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSponsorId(sponsor.sponsor_id);
                      setEditOpen(true);
                    }}
                  >
                    {t("event.sponsors.edit")}
                  </Button>
                </td>
              </tr>
            ))}

            {data.items.length === 0 && (
              <tr>
                <td className="p-4 text-sm text-muted-foreground" colSpan={5}>
                  {t("sponsorPicker.none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />

      <GlobalSponsorCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setPage(1);
        }}
      />

      <GlobalSponsorEditModal
        open={editOpen}
        onOpenChange={(nextOpen) => {
          setEditOpen(nextOpen);
          if (!nextOpen) setEditingSponsorId(null);
        }}
        sponsorId={editingSponsorId}
      />
    </div>
  );
}
