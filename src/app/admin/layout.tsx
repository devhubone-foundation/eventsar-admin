import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-3">
        <h1 className="text-lg font-semibold">Admin</h1>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}
