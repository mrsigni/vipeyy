import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  console.log("[Auth Nasilemak] Checking authentication...");
  
  const token = req.cookies.get("vipeyadminsession")?.value;
  
  if (!token) {
    console.log("[Auth Nasilemak] No token found in cookies");
    return unauthenticated();
  }

  console.log("[Auth Nasilemak] Token found, verifying...");

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[Auth Nasilemak] JWT_SECRET not configured");
      return unauthenticated();
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    console.log("[Auth Nasilemak] JWT verified, payload:", JSON.stringify(payload));
    
    const sessionToken = payload.sessionToken as string;
    const adminId = payload.adminId as string;
    
    if (!sessionToken || !adminId) {
      console.log("[Auth Nasilemak] Missing sessionToken or adminId in payload");
      return unauthenticated();
    }

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken },
      include: { admin: true },
    });

    if (!session) {
      console.log("[Auth Nasilemak] Session not found in database");
      return unauthenticated();
    }

    if (session.expires < new Date()) {
      console.log("[Auth Nasilemak] Session expired");
      await prisma.adminSession.delete({ where: { sessionToken } }).catch(() => {});
      return unauthenticated();
    }

    const { id, email, name } = session.admin;
    console.log("[Auth Nasilemak] Authentication successful for:", email);

    const res = NextResponse.json({ authenticated: true, admin: { id, email, name } });
    res.cookies.set("vipey_admin", JSON.stringify({ id, email, name }), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    console.error("[Auth Nasilemak] JWT verification failed:", error);
    return unauthenticated();
  }
}

function unauthenticated() {
  console.log("[Auth Nasilemak] Returning unauthenticated response");
  const res = NextResponse.json({ authenticated: false }, { status: 401 });
  res.cookies.set("vipeyadminsession", "", { path: "/", maxAge: 0 });
  res.cookies.set("vipey_admin", "", { path: "/", maxAge: 0 });
  return res;
}