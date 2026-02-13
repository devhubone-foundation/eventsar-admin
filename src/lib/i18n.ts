// src/lib/i18n.ts
import bg from "@/messages/bg.json";
import en from "@/messages/en.json";

export type Lang = "bg" | "en";
export const SUPPORTED_LANGS: Lang[] = ["bg", "en"];
export const DEFAULT_LANG: Lang = "bg";

const DICTS: Record<Lang, Record<string, string>> = { bg, en };

export function getDict(lang: string): Record<string, string> {
  return DICTS[(SUPPORTED_LANGS.includes(lang as Lang) ? lang : DEFAULT_LANG) as Lang];
}

export function createT(dict: Record<string, string>) {
  return (key: string) => dict[key] ?? key;
}
