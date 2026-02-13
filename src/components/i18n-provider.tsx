// src/components/i18n-provider.tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Lang } from "@/lib/i18n";
import { createT } from "@/lib/i18n";

type I18nCtx = {
  lang: Lang;
  dict: Record<string, string>;
  t: (key: string) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({
                               lang,
                               dict,
                               children,
                             }: {
  lang: Lang;
  dict: Record<string, string>;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nCtx>(() => ({ lang, dict, t: createT(dict) }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
