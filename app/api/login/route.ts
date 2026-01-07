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
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { message: "Akun belum diverifikasi. Silakan cek email Anda untuk kode OTP." },
        { status: 403 }
      );
    }
    if (user.isSuspended) {
      return NextResponse.json({ message: "Akun Anda telah disuspend." }, { status: 403 });
    }
    await prisma.session.deleteMany({ where: { userId: user.id } });
    const sessionToken = nanoid();
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        sessionToken,
      },
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "7d",
      }
    );

    const res = NextResponse.json({ message: "Login berhasil" });

    res.cookies.set("vipeysession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
  }
}