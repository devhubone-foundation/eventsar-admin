// src/app/api/meta/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ message: "NEXT_PUBLIC_API_BASE_URL missing" }, { status: 500 });
  }

  const url = new URL("/api/meta", base);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "*/*" },
    // no cookies needed; but harmless to include
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return NextResponse.json(data, { status: res.status });
}
