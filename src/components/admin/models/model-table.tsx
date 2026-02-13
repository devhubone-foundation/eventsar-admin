// src/components/admin/models/model-table.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function ModelTable({
                             items,
                           }: {
  items: Array<{
    model_id: number;
    name: string | null;
    type: string;
    version: number | null;
    file_size_bytes: number | null;
    storage_path: string;
    created_at: string;
  }>;
}) {
  const { lang, t } = useI18n();

  return (
    <div className="rounded border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
        <tr className="text-left">
          <th className="p-3">ID</th>
          <th className="p-3">Name</th>
          <th className="p-3">Type</th>
          <th className="p-3">Version</th>
          <th className="p-3">Size</th>
          <th className="p-3">Path</th>
          <th className="p-3"></th>
        </tr>
        </thead>
        <tbody>
        {items.map((m) => (
          <tr key={m.model_id} className="border-t">
            <td className="p-3">{m.model_id}</td>
            <td className="p-3">{m.name ?? "—"}</td>
            <td className="p-3">{m.type}</td>
            <td className="p-3">{m.version ?? "—"}</td>
            <td className="p-3">
              {m.file_size_bytes ? `${Math.round(m.file_size_bytes / 1024)} KB` : "—"}
            </td>
            <td className="p-3 max-w-[360px] truncate" title={m.storage_path}>
              {m.storage_path}
            </td>
            <td className="p-3">
              <Button asChild size="sm" variant="outline">
                <Link href={`/${lang}/admin/assets/models/${m.model_id}`}>{t("models.open")}</Link>
              </Button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
