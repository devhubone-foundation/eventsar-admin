import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { validateSameOrigin } from "@/lib/security/csrf";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const incoming = await req.formData();

  const fd = new FormData();
  for (const [key, value] of incoming.entries()) {
    fd.append(key, value as any);
  }

  const res = await fetch(`${config.apiBaseUrl}/api/admin/upload/model/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return NextResponse.json(data, { status: res.status });
}
