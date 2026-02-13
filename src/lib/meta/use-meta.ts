// src/lib/meta/use-meta.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeta } from "@/lib/api/meta";
import { qk } from "@/lib/api/keys";
import { useI18n } from "@/components/i18n-provider";

export function useMetaEnums() {
  const { t } = useI18n();

  const q = useQuery({
    queryKey: qk.meta(),
    queryFn: getMeta,
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 6, // 6h
  });

  function enumLabel(group: string, value: string) {
    const key = `enum.${group}.${value}`;
    const out = t(key);
    // if missing translation, most i18n helpers return the key itself
    return out === key ? value : out;
  }

  return {
    ...q,
    enums: q.data?.enums ?? {},
    enumLabel,
  };
}
