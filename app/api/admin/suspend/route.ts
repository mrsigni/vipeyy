import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID diperlukan." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    const newStatus = !user.isSuspended;

    await prisma.user.update({
      where: { id },
      data: {
        isSuspended: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: newStatus
        ? "User berhasil disuspend."
        : "User berhasil diaktifkan kembali.",
    });
  } catch (error) {
    console.error("Suspend error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
  }
}

function unauthenticated() {
  const res = NextResponse.json({ authenticated: false }, { status: 401 });
  res.cookies.set("vipeyadminsession", "", { path: "/", maxAge: 0 });
  res.cookies.set("vipey_admin", "", { path: "/", maxAge: 0 });
  return res;
}