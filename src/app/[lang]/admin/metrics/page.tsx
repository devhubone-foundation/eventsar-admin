"use client";
import { useI18n } from "@/components/i18n-provider";
export default function Page() {
  const { t } = useI18n();
  return <div className="text-sm text-muted-foreground">{t("admin.placeholder")}</div>;
}
