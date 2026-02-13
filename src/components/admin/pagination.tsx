// src/components/admin/pagination.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function Pagination({
                             page,
                             pageSize,
                             total,
                             onPage,
                           }: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">
        Page {page} / {totalPages} — {total} items
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          {t("pagination.prev")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}
