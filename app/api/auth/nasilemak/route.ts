import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("vipeyadminsession")?.value;
  if (!token) return unauthenticated();

  try {
    const secret = process.env.JWT_SECRET!;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const sessionToken = payload.sessionToken as string;
    if (!sessionToken) return unauthenticated();

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken },
      include: { admin: true },
    });

    if (!session || session.expires < new Date()) {
      await prisma.adminSession.deleteMany({ where: { sessionToken } });
      return unauthenticated();
    }

    const { id, email, name } = session.admin;

    const res = NextResponse.json({ authenticated: true });
    res.cookies.set("vipey_admin", JSON.stringify({ id, email, name }), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return unauthenticated();
  }
}

function unauthenticated() {
  const res = NextResponse.json({ authenticated: false }, { status: 401 });
  res.cookies.set("vipeyadminsession", "", { path: "/", maxAge: 0 });
  res.cookies.set("vipey_admin", "", { path: "/", maxAge: 0 });
  return res;
}