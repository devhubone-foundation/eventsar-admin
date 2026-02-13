// src/components/admin/images/image-card.tsx
"use client";

import Link from "next/link";
import { ImageThumb } from "@/components/admin/image-thumb";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function ImageCard({
                            lang,
                            image,
                          }: {
  lang: "bg" | "en";
  image: {
    image_id: number;
    name: string | null;
    storage_path: string;
    mime_type: string | null;
    created_at: string;
  };
}) {
  const { t } = useI18n();

  return (
    <div className="rounded border p-3">
      <div className="flex gap-3 items-start">
        <ImageThumb
          storage_path={image.storage_path}
          alt={image.name ?? `image ${image.image_id}`}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-medium truncate">{image.name ?? `#${image.image_id}`}</div>
          <div className="text-xs text-muted-foreground truncate">{image.storage_path}</div>
          <div className="text-xs text-muted-foreground">{image.mime_type ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{new Date(image.created_at).toLocaleString()}</div>

          <div className="pt-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${lang}/admin/assets/images/${image.image_id}`}>{t("images.open")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
