import { type NextRequest, NextResponse } from "next/server";

import { canAccessPath } from "@/lib/auth/middleware-rules";
import { getMiddlewareSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user, roles } = await getMiddlewareSession(request);

  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (roles.length === 0) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "no_roles");
      return NextResponse.redirect(loginUrl);
    }

    const { ok } = canAccessPath(pathname, roles);
    if (!ok) {
      const dash = new URL("/dashboard", request.url);
      dash.searchParams.set("error", "forbidden");
      return NextResponse.redirect(dash);
    }
  }

  if (pathname === "/login" && user && roles.length > 0) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") ?? "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
