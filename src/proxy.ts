import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Defense-in-depth against cross-site state-changing requests. Session cookies
// are already SameSite=Lax; this additionally rejects any mutating /api call
// whose Origin header is present and does not match the host it is served from.
// Requests with no Origin (server-to-server, cron pings, curl) carry no ambient
// browser credentials and are left alone -- the cron route has its own secret.
//
// Next 16 calls this file convention "proxy" (formerly "middleware").
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  const knownHosts = new Set(
    [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.nextUrl.host,
    ].filter((value): value is string => Boolean(value))
  );

  if (!knownHosts.has(originHost)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
