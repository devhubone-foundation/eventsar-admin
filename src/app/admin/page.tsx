// src/app/admin/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminHomePage() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <Button variant="outline" onClick={logout}>
        Logout
      </Button>
    </main>
  );
}
