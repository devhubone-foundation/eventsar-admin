// src/components/admin/file-dropzone.tsx
"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function FileDropzone({
                               accept,
                               file,
                               onFile,
                               labelKey,
                             }: {
  accept?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  labelKey?: string; // translation key
}) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    onFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    onFile(f);
  }

  return (
    <div className="space-y-2">
      {labelKey && <div className="text-sm font-medium">{t(labelKey)}</div>}

      <div
        className={cn(
          "rounded-md border border-dashed p-4 transition-colors",
          dragOver ? "bg-muted" : "bg-background"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <div>{t("dropzone.dragDrop")}</div>
            <div className="text-xs">{t("dropzone.or")}</div>
            {file && (
              <div className="mt-2 text-xs text-foreground">
                {t("dropzone.selected")}:{" "}
                <span className="font-medium">{file.name}</span>{" "}
                ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={pick}>
              {t("dropzone.chooseFile")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={!file}
            >
              {t("dropzone.clear")}
            </Button>
          </div>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          className="hidden"
          type="file"
          accept={accept}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
