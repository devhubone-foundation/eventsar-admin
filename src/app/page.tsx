import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>EventsAR Admin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Admin panel placeholder
          </p>
          <Link href="/admin/login">
            <Button className="w-full">Go to Admin Login</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
