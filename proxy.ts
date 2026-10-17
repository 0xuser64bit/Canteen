import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-canteen-return-to",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/campus/:path*",
    "/home/:path*",
    "/new",
    "/me",
    "/settings",
    "/notifications",
    "/mod",
    "/launch",
    "/host",
    "/p/:path*",
    "/u/:path*",
  ],
};
