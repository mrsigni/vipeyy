import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("vipeysession")?.value;
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register" || pathname.startsWith("/register/");
  const isDashboardPage = pathname.startsWith("/dashboard");

  // Check if JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error("[Middleware] JWT_SECRET is not configured");
    // Allow access to login/register pages, block dashboard
    if (isDashboardPage) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);

      // If authenticated and on login/register, redirect to dashboard
      if (isLoginPage || isRegisterPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch (error) {
      console.error("[Middleware] Token verification failed:", error);
      
      // Invalid token - clear cookie
      const res = isLoginPage || isRegisterPage
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/login", req.url));
      
      res.cookies.set("vipeysession", "", {
        path: "/",
        maxAge: 0,
      });
      return res;
    }
  } else {
    // No token - redirect to login if trying to access dashboard
    if (isDashboardPage) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register/:path*", "/dashboard/:path*"],
};