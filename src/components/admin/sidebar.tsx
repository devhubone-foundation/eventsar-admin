// src/components/admin/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminNavItems } from "@/components/admin/nav-items";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export function AdminSidebar({
                               collapsed,
                               onToggle,
                             }: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { lang, t } = useI18n();

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen sticky top-0 border-r bg-background",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between p-3 border-b">
          <Link href={`/${lang}/admin`} className="font-semibold truncate">
            {collapsed ? "AR" : "EventsAR Admin"}
          </Link>
          <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="p-2 space-y-1">
          {adminNavItems.map((item) => {
            const href = item.href(lang);
            const active = pathname === href || pathname.startsWith(href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={collapsed ? t(item.key) : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{t(item.key)}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
