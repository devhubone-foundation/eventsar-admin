// src/components/admin/mobile-drawer.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { adminNavItems } from "@/components/admin/nav-items";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

export function AdminMobileDrawer() {
  const pathname = usePathname();
  const { lang, t } = useI18n();

  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>EventsAR Admin</SheetTitle>
          </SheetHeader>

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
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
