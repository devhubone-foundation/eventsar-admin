// src/components/admin/topbar.tsx
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { AdminMobileDrawer } from "@/components/admin/mobile-drawer";
import { LogoutButton } from "@/components/admin/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";

export function AdminTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AdminMobileDrawer />
          <div className="min-w-0">
            <AdminBreadcrumbs />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
