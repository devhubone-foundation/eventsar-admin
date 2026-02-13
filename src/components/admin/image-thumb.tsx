// src/components/admin/image-thumb.tsx
"use client";

import Image from "next/image";
import { getStorageUrl } from "@/lib/storage";

export function ImageThumb({
                             storage_path,
                             alt,
                             className,
                           }: {
  storage_path: string;
  alt: string;
  className?: string;
}) {
  const url = getStorageUrl(storage_path);

  return (
    <div className={className}>
      <Image
        src={url}
        alt={alt}
        width={160}
        height={90}
        className="h-20 w-32 object-cover rounded border"
        unoptimized
      />
      <div className="mt-1 text-xs text-muted-foreground break-all">{storage_path}</div>
    </div>
  );
}
