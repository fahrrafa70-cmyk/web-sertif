import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirect old /c/{xid} to /c/redirect/{xid} for lookup and redirect
  // This will be handled by a redirect page that looks up the certificate
  if (pathname.match(/^\/c\/[^/]+$/)) {
    const id = pathname.replace("/c/", "");
    return NextResponse.redirect(new URL(`/c/redirect/${id}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
