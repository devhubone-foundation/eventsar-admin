// src/app/[lang]/admin/debug/image-picker/page.tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { ImagePicker, type ImagePickerValue } from "@/components/admin/images/image-picker";

export default function ImagePickerDebugPage() {
  const { t } = useI18n();
  const [val, setVal] = useState<ImagePickerValue>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">ImagePicker Debug</h1>
      <p className="text-sm text-muted-foreground">
        Select existing / upload inline / clear. No IDs required.
      </p>

      <ImagePicker
        value={val}
        onChange={setVal}
        allowedScopes={["SPONSOR", "GLOBAL", "EVENT"]}
        // eventSlug only needed if you want to test EVENT-scope upload:
        // eventSlug="sofia-tech-expo-2026"
      />

      <div className="rounded border p-3 text-sm">
        <div className="font-medium">{t("picker.selected")}</div>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
      </div>
    </div>
  );
}
