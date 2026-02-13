// src/components/admin/logout-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

export function LogoutButton() {
  const router = useRouter();
  const { lang, t } = useI18n();

  async function logout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      toast.error("Logout failed");
      return;
    }
    toast.success(t("common.logout"));
    router.replace(`/${lang}/admin/login`);
  }

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      {t("common.logout")}
    </Button>
  );
}
