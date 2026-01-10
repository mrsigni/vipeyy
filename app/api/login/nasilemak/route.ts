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
    console.log("🔍 Login attempt for email:", email);
    
    const admin = await prisma.admin.findUnique({ where: { email } });
    console.log("Admin found:", !!admin);
    console.log("Admin details:", admin ? { id: admin.id, email: admin.email, name: admin.name } : null);

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      console.log("❌ Invalid credentials");
      return NextResponse.json({ message: "Email atau password salah" }, { status: 401 });
    }

    console.log("✅ Password verified");

    // Delete existing sessions
    await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });
    console.log("🗑️ Old sessions deleted");

    const sessionToken = nanoid();
    console.log("📝 Session token generated:", sessionToken);

    // Create new session
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        sessionToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("💾 New session created in database");

    // Create JWT payload
    const jwtPayload = {
      adminId: admin.id,
      sessionToken,
    };
    console.log("🎫 JWT Payload:", JSON.stringify(jwtPayload, null, 2));

    const token = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "7d",
      }
    );
    console.log("🔐 JWT Token created, length:", token.length);

    // Verify the token we just created
    try {
      const verifyTest = jwt.verify(token, process.env.JWT_SECRET!) as any;
      console.log("✅ Token verification test:", JSON.stringify(verifyTest, null, 2));
    } catch (verifyError) {
      console.error("❌ Token verification test failed:", verifyError);
    }

    const res = NextResponse.json({ 
      message: "Login berhasil",
      debug: {
        adminId: admin.id,
        adminIdLength: admin.id.length,
        adminIdType: typeof admin.id,
        sessionToken,
        jwtPayload
      }
    });

    res.cookies.set("vipeyadminsession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    console.log("🍪 Cookie set successfully");
    return res;
  } catch (error) {
    console.error("[ADMIN_LOGIN_ERROR]", error);
    return NextResponse.json({ message: "Terjadi kesalahan server." }, { status: 500 });
  }
}