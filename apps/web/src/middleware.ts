import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  isLocalDevHost,
  isWwwHost,
  stripWwwHost,
} from "@/lib/canonical-site-url";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

function wwwToApexRedirect(request: NextRequest): NextResponse | null {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  if (!isWwwHost(host)) return null;

  const apexHost = stripWwwHost(host);
  if (isLocalDevHost(apexHost)) return null;

  const url = request.nextUrl.clone();
  url.hostname = apexHost;
  url.port = "";
  url.protocol = "https";

  return NextResponse.redirect(url, 301);
}

export default function middleware(request: NextRequest) {
  const redirect = wwwToApexRedirect(request);
  if (redirect) return redirect;

  const { pathname } = request.nextUrl;
  // /admin, /manage, /api — без i18n, но www→apex уже отработал выше.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/manage") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/",
    "/(en)/:path*",
    "/admin/:path*",
    "/manage/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
