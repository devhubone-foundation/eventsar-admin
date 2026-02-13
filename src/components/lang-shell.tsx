"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export function LangShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const pathname = usePathname();
  const adminPrefix = `/${lang}/admin`;
  const isAdminRoute = pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`);

  if (isAdminRoute) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link href={`/${lang}`} className="font-semibold">
            EventsAR
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
