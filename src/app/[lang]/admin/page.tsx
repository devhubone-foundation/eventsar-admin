// src/app/[lang]/admin/page.tsx
"use client";

import { useI18n } from "@/components/i18n-provider";

export default function AdminHomePage() {
  const { t } = useI18n();
  return (
    <main className="space-y-2">
      <h1 className="text-xl font-semibold">{t("admin.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("admin.placeholder")}</p>
    </main>
  );
}
