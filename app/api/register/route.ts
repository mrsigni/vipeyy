import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { transporter } from "@/lib/mailer";
import { randomBytes } from "crypto";
import { addMinutes } from "date-fns";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Nama wajib diisi")
      .max(50, "Nama maksimal 50 karakter")
      .regex(/^[a-zA-Z\s]+$/, "Nama hanya boleh huruf dan spasi"),
    whatsapp: z
      .string()
      .min(1, "Nomor WhatsApp wajib diisi")
      .regex(/^\+\d{8,15}$/, "Nomor WhatsApp tidak valid"),
    email: z.string().email("Email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-z]/, "Password harus mengandung huruf kecil")
      .regex(/[A-Z]/, "Password harus mengandung huruf besar")
      .regex(/\d/, "Password harus mengandung angka")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/,
        "Password harus mengandung karakter khusus"
      ),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

async function generateUniqueUsername(name: string): Promise<string> {
  const base = name.toLowerCase().replace(/\s+/g, "");
  let username = base;
  let attempts = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${Math.floor(100 + Math.random() * 900)}`;
    if (++attempts > 10) break;
  }
  return username;
}

const limiter = rateLimit({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 500,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitResult = limiter.check(req, 3, `register_${ip}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          message: `Terlalu banyak percobaan registrasi. Silakan coba lagi dalam ${rateLimitResult.retryAfter} detik.`,
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      );
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const formatted = result.error.format();
      return NextResponse.json({ errors: formatted }, { status: 400 });
    }

    const { fullName, whatsapp, email, password } = result.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { whatsapp }] },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Registrasi gagal. Silakan coba dengan data berbeda." },
        { status: 400 }
      );
    }

    const username = await generateUniqueUsername(fullName);
    const hashed = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = addMinutes(new Date(), 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          whatsapp,
          username,
          password: hashed,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: otp,
          expiresAt,
        },
      });

      return user;
    }, {
      timeout: 10000,
      maxWait: 3000,
    });

    await transporter.sendMail({
      from: `"Verifikasi Email" <${process.env.SMTP_USER}>`,
      to: newUser.email,
      subject: "Kode OTP Verifikasi Email",
      html: `
        <p>Halo ${newUser.fullName},</p>
        <p>Gunakan kode berikut untuk verifikasi email kamu:</p>
        <h2>${otp}</h2>
        <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
      `,
    });

    return NextResponse.json(
      {
        message: "Registrasi berhasil. OTP telah dikirim ke email Anda.",
      },
      {
        headers: {
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
      }
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Register error:", err);
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}