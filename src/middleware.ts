// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_ADMIN_PATH_SUFFIXES = ["/admin/login"];

function getPreferredLang(req: NextRequest): Lang {
  const cookieLang = req.cookies.get("lang")?.value;
  if (cookieLang && SUPPORTED_LANGS.includes(cookieLang as Lang)) return cookieLang as Lang;
  return DEFAULT_LANG;
}

function hasLangPrefix(pathname: string): boolean {
  const seg = pathname.split("/").filter(Boolean)[0];
  return SUPPORTED_LANGS.includes(seg as Lang);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next internals + API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const preferred = getPreferredLang(req);

  // If no lang prefix, redirect by rules
  if (!hasLangPrefix(pathname)) {
    const url = req.nextUrl.clone();

    if (pathname === "/") {
      url.pathname = `/${preferred}`;
      return NextResponse.redirect(url);
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      url.pathname = `/${preferred}${pathname}`;
      return NextResponse.redirect(url);
    }

    url.pathname = `/${preferred}${pathname}`;
    return NextResponse.redirect(url);
  }

  // has lang
  const parts = pathname.split("/").filter(Boolean);
  const lang = parts[0] as Lang;

  // persist lang cookie (server-side) so "no lang path" redirect uses last choice
  const res = NextResponse.next();
  res.cookies.set({ name: "lang", value: lang, path: "/", sameSite: "lax" });

  // admin protection: /{lang}/admin/*
  const isAdmin = parts[1] === "admin";
  if (isAdmin) {
    const isLogin = pathname.endsWith("/admin/login");
    if (!isLogin) {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = `/${lang}/admin/login`;
        return NextResponse.redirect(url);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|api).*)"],
};
