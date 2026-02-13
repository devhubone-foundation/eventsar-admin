"use client";

import { useRef } from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CopyValue = {
  label: string;
  value: string;
};

type QrCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  helperText?: string;
  copyValues?: CopyValue[];
};

export function QrCard({ title, value, subtitle, helperText, copyValues = [] }: QrCardProps) {
  const { t } = useI18n();
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("event.qr.copied"));
    } catch {
      toast.error(t("event.qr.copyFailed"));
    }
  };

  const onDownload = () => {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg) {
      toast.error(t("event.qr.downloadFailed"));
      return;
    }

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "event-qr.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div ref={qrWrapRef} className="inline-block rounded-lg border bg-white p-3">
          <QRCode value={value} size={180} />
        </div>

        <div className="flex flex-wrap gap-2">
          {copyValues.map((item) => (
            <Button key={item.label} type="button" variant="outline" size="sm" onClick={() => onCopy(item.value)}>
              {item.label}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onDownload}>
            {t("event.qr.download")}
          </Button>
        </div>

        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      </CardContent>
    </Card>
  );
}
