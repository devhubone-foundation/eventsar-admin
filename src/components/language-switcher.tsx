// src/components/language-switcher.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

function getNextPath(pathname: string, targetLang: Lang): string {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0];

  if (SUPPORTED_LANGS.includes(first as Lang)) {
    parts[0] = targetLang;
    return "/" + parts.join("/");
  }

  // No lang prefix: inject
  return "/" + [targetLang, ...parts].join("/");
}

function setLangCookie(lang: Lang) {
  // simple client-set cookie for redirect preference
  document.cookie = `lang=${lang}; Path=/; SameSite=Lax`;
  try {
    localStorage.setItem("lang", lang);
  } catch {}
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: Lang) {
    setLangCookie(target);
    router.push(getNextPath(pathname, target));
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={lang === "bg" ? "default" : "outline"}
          onClick={() => switchTo("bg")}
        >
          {t("lang.bg")}
        </Button>
        <Button
          size="sm"
          variant={lang === "en" ? "default" : "outline"}
          onClick={() => switchTo("en")}
        >
          {t("lang.en")}
        </Button>
      </div>
    </div>
  );
}
