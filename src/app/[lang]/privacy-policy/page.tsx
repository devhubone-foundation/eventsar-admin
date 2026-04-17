"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

const SECTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

export default function PrivacyPolicyPage() {
  const { lang, t } = useI18n();

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("privacy.eyebrow")}
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("privacy.title")}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t("privacy.intro")}
            </p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {t("privacy.updated")}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((section) => (
            <Card key={section}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {t(`privacy.section${section}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                  {t(`privacy.section${section}.body`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Link
            href={`/${lang}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("privacy.back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
