// src/components/admin/breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

function titleize(seg: string) {
  return seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  // parts like: ["admin","events","123","experiences"]
  if (!parts.length || parts[0] !== "admin") return null;

  const crumbs = parts.map((seg, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const label = idx === 0 ? "Admin" : titleize(seg);
    return { href, label, key: `${href}-${idx}` };
  });

  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      {crumbs.map((c, idx) => (
        <span key={c.key} className="flex items-center">
          {idx > 0 && <ChevronRight className="mx-2 h-4 w-4" />}
          <Link
            href={c.href}
            className="hover:text-foreground transition-colors"
          >
            {c.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
