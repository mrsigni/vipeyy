import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  const admin = await getAdminFromSession(req);
  if (!admin) return unauthenticated();

  const settings = await prisma.webSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    return NextResponse.json({ message: "Settings tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ cpm: settings.cpm });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromSession(req);
  if (!admin) return unauthenticated();

  const { cpm } = await req.json();

  if (typeof cpm !== "number" || cpm <= 0) {
    return NextResponse.json({ message: "CPM tidak valid" }, { status: 400 });
  }

  const updated = await prisma.webSettings.update({
    where: { id: 1 },
    data: { cpm },
  });

  return NextResponse.json({ cpm: updated.cpm });
}

async function getAdminFromSession(req: NextRequest) {
  try {
    const token = req.cookies.get("vipeyadminsession")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    const sessionToken = payload.sessionToken as string;
    if (!sessionToken) return null;

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken },
      include: { admin: true },
    });

    if (!session || session.expires < new Date()) {
      await prisma.adminSession.deleteMany({ where: { sessionToken } });
      return null;
    }

    return session.admin;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

function unauthenticated() {
  const res = NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  res.cookies.set("vipeyadminsession", "", { path: "/", maxAge: 0 });
  res.cookies.set("vipey_admin", "", { path: "/", maxAge: 0 });
  return res;
}
