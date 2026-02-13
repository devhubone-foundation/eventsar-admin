// src/app/[lang]/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

export default function PublicLanding() {
  const { lang, t } = useI18n();

  return (
    <main className="p-6 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t("app.name")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("common.comingSoon")}
          </p>
          <Button asChild>
            <Link href={`/${lang}/admin/login`}>{t("public.adminLink")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
