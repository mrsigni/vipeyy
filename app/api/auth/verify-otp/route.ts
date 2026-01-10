import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const verifyOtpSchema = z.object({
  email: z.string().email("Email tidak valid"),
  token: z.string().length(6, "OTP harus 6 digit"),
});

const limiter = rateLimit({
  interval: 10 * 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = limiter.check(req, 5, `verify_otp_${ip}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          message: `Terlalu banyak percobaan verifikasi OTP. Silakan coba lagi dalam ${rateLimitResult.retryAfter} detik.`,
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
    const result = verifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { email, token } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ message: "Email sudah diverifikasi" }, { status: 400 });
    }

    const otp = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json({ message: "OTP salah atau kedaluwarsa" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.delete({ where: { id: otp.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      }),
    ]);

    return NextResponse.json(
      { message: "Email berhasil diverifikasi" },
      {
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
      }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Verify OTP error:", error);
    }

    return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
  }
}