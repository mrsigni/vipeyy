import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("vipeysession")?.value;
  const { pathname } = req.nextUrl;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);

      if (pathname === "/login" || pathname === "/register") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.set("vipeysession", "", {
        path: "/",
        maxAge: 0,
      });
      return res;
    }
  }

  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
};