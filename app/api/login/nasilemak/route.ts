import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { email, password } = result.data;

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }

    const sessionToken = nanoid();

    await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const jwtPayload = {
      adminId: admin.id,
      sessionToken,
    };

    const token = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "7d",
      }
    );

    const res = NextResponse.json({
      message: "Login berhasil"
    });

    res.cookies.set("vipeyadminsession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error) {
    console.error("[ADMIN_LOGIN_ERROR]", error);
    return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
  }
}