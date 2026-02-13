// src/app/[lang]/admin/assets/upload/page.tsx
"use client";

import { UploadImageForm } from "@/components/admin/upload-image-form";
import { UploadModelForm } from "@/components/admin/upload-model-form";
import { useI18n } from "@/components/i18n-provider";

export default function UploadCenterPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t("upload.centerTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("upload.centerSubtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UploadImageForm />
        <UploadModelForm />
      </div>
    </div>
  );
}
