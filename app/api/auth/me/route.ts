import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("vipeysession")?.value;
  if (!token) return unauthenticated();

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[Auth/Me] JWT_SECRET not configured");
      return unauthenticated();
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const sessionToken = payload.sessionToken as string;
    if (!sessionToken) return unauthenticated();

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { 
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
          }
        } 
      },
    });

    if (!session || session.expires < new Date()) {
      // Delete expired session in background, don't wait
      if (session) {
        prisma.session.delete({ where: { sessionToken } }).catch(() => {});
      }
      return unauthenticated();
    }

    const { id, username, email, fullName } = session.user;
    const res = NextResponse.json({ authenticated: true });

    res.cookies.set("vipeyy_client", JSON.stringify({ id, username, email, fullName }), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    console.error("[Auth/Me Error]:", error);
    return unauthenticated();
  }
}

function unauthenticated() {
  const res = NextResponse.json({ authenticated: false }, { status: 401 });
  res.cookies.set("vipeysession", "", { path: "/", maxAge: 0 });
  res.cookies.set("vipeyy_client", "", { path: "/", maxAge: 0 });

  return res;
}