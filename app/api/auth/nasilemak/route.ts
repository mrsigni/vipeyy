import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("vipeyadminsession")?.value;
    
    if (!token) {
      console.log("[Auth Nasilemak] No token");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[Auth Nasilemak] JWT_SECRET not configured");
      return NextResponse.json({ authenticated: false, error: "config" }, { status: 500 });
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    
    const sessionToken = payload.sessionToken as string;
    const adminId = payload.adminId as string;
    
    if (!sessionToken || !adminId) {
      console.log("[Auth Nasilemak] Invalid payload");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken },
      include: { admin: true },
    });

    if (!session) {
      console.log("[Auth Nasilemak] Session not found");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (session.expires < new Date()) {
      console.log("[Auth Nasilemak] Session expired");
      await prisma.adminSession.delete({ where: { sessionToken } }).catch(() => {});
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { id, email, name } = session.admin;

    const res = NextResponse.json({ authenticated: true, admin: { id, email, name } });
    res.cookies.set("vipey_admin", JSON.stringify({ id, email, name }), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    console.error("[Auth Nasilemak] Error:", error);
    return NextResponse.json({ authenticated: false, error: "server" }, { status: 500 });
  }
}