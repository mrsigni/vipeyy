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
    console.log("[Admin Login] Attempt for email:", email);

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error("[Admin Login] JWT_SECRET not configured");
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }
    
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      console.log("[Admin Login] Admin not found");
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      console.log("[Admin Login] Invalid password");
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }

    console.log("[Admin Login] Password verified for:", admin.email);

    // Delete existing sessions
    await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });

    const sessionToken = nanoid();

    // Create new session
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log("[Admin Login] Session created");

    const token = jwt.sign(
      {
        adminId: admin.id,
        sessionToken,
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "7d",
      }
    );

    console.log("[Admin Login] JWT created, setting cookie...");

    const res = NextResponse.json({ 
      message: "Login berhasil",
      success: true
    });

    res.cookies.set("vipeyadminsession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    console.log("[Admin Login] Login successful for:", admin.email);
    return res;
  } catch (error) {
    console.error("[Admin Login] Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
  }
}