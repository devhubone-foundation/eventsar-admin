// src/app/[lang]/admin/layout.tsx
"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[auto_1fr]">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="min-w-0">
        <AdminTopbar />
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
