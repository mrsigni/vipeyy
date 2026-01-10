import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const limiter = rateLimit({
  interval: 10 * 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = limiter.check(req, 5, `login_${ip}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rateLimitResult.retryAfter} detik.`,
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      );
    }

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

    res.headers.set('X-RateLimit-Limit', '5');
    res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString());

    return res;
  } catch {
    return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
  }
}