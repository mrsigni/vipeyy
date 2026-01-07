import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie");
    const token = cookie?.split("; ").find((c) => c.startsWith("vipeysession="))?.split("=")[1];

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId, sessionToken } = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      sessionToken: string;
    };

    await prisma.session.deleteMany({
      where: { userId, sessionToken },
    });

    const res = NextResponse.json({ message: "Logout berhasil" });
    res.cookies.set("vipeysession", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}