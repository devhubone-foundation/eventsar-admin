// src/app/[lang]/layout.tsx
import { I18nProvider } from "@/components/i18n-provider";
import { getDict, type Lang } from "@/lib/i18n";
import { LangShell } from "@/components/lang-shell";

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
      <LangShell lang={lang}>{children}</LangShell>
    </I18nProvider>
  );
}
