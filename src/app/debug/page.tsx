import { config } from "@/lib/config";
import { apiGet } from "@/lib/api/fetcher";

export default async function DebugPage() {
  let result: unknown = null;
  let error: string | null = null;

  try {
    result = await apiGet("/api/health"); // from Swagger :contentReference[oaicite:1]{index=1}
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Debug</h1>

      <div className="rounded border p-4">
        <div className="font-medium">API Base URL</div>
        <div className="text-sm">{config.apiBaseUrl || "(missing NEXT_PUBLIC_API_BASE_URL)"}</div>
      </div>

      <div className="rounded border p-4">
        <div className="font-medium">GET /api/health</div>
        {error ? (
          <pre className="text-sm whitespace-pre-wrap">{error}</pre>
        ) : (
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </main>
  );
}
