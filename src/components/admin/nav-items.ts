// src/components/admin/nav-items.ts
import { Calendar, Image, LayoutDashboard, LineChart, Shapes, Star, Upload } from "lucide-react";
import type { Lang } from "@/lib/i18n";

export type AdminNavItem = {
  key: string; // translation key
  href: (lang: Lang) => string;
  icon: React.ComponentType<{ className?: string }>;
};

export const adminNavItems: AdminNavItem[] = [
  { key: "nav.dashboard", href: (lang) => `/${lang}/admin`, icon: LayoutDashboard },
  { key: "nav.events", href: (lang) => `/${lang}/admin/events`, icon: Calendar },
  { key: "nav.sponsors", href: (lang) => `/${lang}/admin/sponsors`, icon: Star },
  { key: "nav.upload", href: (lang) => `/${lang}/admin/assets/upload`, icon: Upload },
  { key: "nav.assets", href: (lang) => `/${lang}/admin/assets/images`, icon: Image },
  { key: "nav.models", href: (lang) => `/${lang}/admin/assets/models`, icon: Shapes },
  { key: "nav.metrics", href: (lang) => `/${lang}/admin/metrics`, icon: LineChart }
];
