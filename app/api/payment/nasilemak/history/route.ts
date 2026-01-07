import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("vipeyadminsession")?.value;
  if (!token) return unauthenticated();

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

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

    const historyPayouts = await prisma.videoPayout.findMany({
      where: {
        status: {
          in: ["approved", "rejected"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            whatsapp: true,
          },
        },
        details: {
          select: {
            videoId: true,
            amount: true,
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
    });

    return NextResponse.json({ historyPayouts });
  } catch (error) {
    console.error("[ADMIN] Error fetching payout history:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function unauthenticated() {
  const res = NextResponse.json({ authenticated: false }, { status: 401 });
  res.cookies.set("vipeyadminsession", "", { path: "/", maxAge: 0 });
  res.cookies.set("vipey_admin", "", { path: "/", maxAge: 0 });
  return res;
}