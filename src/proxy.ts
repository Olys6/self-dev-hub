import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

// /api/mcp and /api/calendar.ics are excluded — both authenticate themselves
// (bearer token / feed token) rather than the session cookie, since neither
// an MCP client nor a calendar app can complete a login redirect.
// NOTE: despite the file being named proxy.ts, Next.js 16.3.5 still reads
// this exported const under the name `config` (verified against
// node_modules/next/dist/esm/build/analysis/get-page-static-info.js) —
// `proxyConfig` is silently ignored, not an error.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/mcp|api/calendar\\.ics).*)"],
};
