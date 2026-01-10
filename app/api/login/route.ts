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
    // Kurangi limit sementara untuk debugging, misal 5 request per IP
    const rateLimitResult = limiter.check(req, 10, `login_${ip}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(rateLimitResult.retryAfter / 1000)} detik.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { email, password } = result.data;
    
    // Gunakan select untuk mengambil hanya data yang perlu (Hemat Memory & Bandwidth)
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        password: true,
        isEmailVerified: true,
        isSuspended: true
      }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { message: "Akun belum diverifikasi." },
        { status: 403 }
      );
    }
    if (user.isSuspended) {
      return NextResponse.json({ message: "Akun Anda telah disuspend." }, { status: 403 });
    }

    const sessionToken = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // OPTIMASI TRANSAKSI:
    // Timeout dikurangi jadi 5 detik (cukup untuk DB normal).
    // Jika lebih dari 5 detik, mending gagal daripada menahan koneksi orang lain.
    await prisma.$transaction(async (tx) => {
      // Hapus session lama (Single Device Login logic?)
      await tx.session.deleteMany({ where: { userId: user.id } });
      
      // Buat session baru
      await tx.session.create({
        data: {
          userId: user.id,
          sessionToken,
          expires: expiresAt,
        },
      });
    }, {
      timeout: 5000, // Turunkan dari 10000 ke 5000
      maxWait: 2000, // Waktu tunggu dapat slot transaksi
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

  } catch (error) {
    // LOGGING PENTING: Agar kita tahu kenapa error terjadi di PM2 logs
    console.error("[LOGIN_ERROR]", error); 
    
    return NextResponse.json(
      { message: "Terjadi kesalahan server." }, 
      { status: 500 }
    );
  }
}
