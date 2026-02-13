// src/app/[lang]/layout.tsx
import { I18nProvider } from "@/components/i18n-provider";
import { getDict, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import Link from "next/link";

export default async function LangLayout({
                                           children,
                                           params,
                                         }: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = (await params) as { lang: Lang };
  const dict = getDict(lang);

  return (
    <I18nProvider lang={lang} dict={dict}>
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
    </I18nProvider>
  );
}
