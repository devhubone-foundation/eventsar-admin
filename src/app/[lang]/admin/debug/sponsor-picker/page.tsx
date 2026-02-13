// src/app/[lang]/admin/debug/sponsor-picker/page.tsx
"use client";

import { useState } from "react";
import { SponsorPicker, type SponsorPickerValue } from "@/components/admin/sponsors/sponsor-picker";

export default function SponsorPickerDebugPage() {
  const [val, setVal] = useState<SponsorPickerValue>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">SponsorPicker Debug</h1>
      <p className="text-sm text-muted-foreground">
        Select existing / create inline (logo required) / clear.
      </p>

      <SponsorPicker value={val} onChange={setVal} />

      <div className="rounded border p-3 text-sm">
        <div className="font-medium">Value</div>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
      </div>
    </div>
  );
}
