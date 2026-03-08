import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "ai-trading-assistant-secret-key-change-in-production"
);
const AUTH_COOKIE = "auth_token";
const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always add security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Skip auth check for public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Skip auth check for API routes (other than protected ones if needed)
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Check auth cookie for page routes
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return response;
  } catch {
    // Invalid/expired token → redirect to login
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set(AUTH_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
