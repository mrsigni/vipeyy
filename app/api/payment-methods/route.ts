import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vipeysession")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    const userId = payload.userId as string;

    const method = await prisma.paymentMethod.findFirst({
      where: { userId },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(method || null);
  } catch (error) {
    console.error("GET payment method error:", error);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vipeysession")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    const userId = payload.userId as string;

    const { type, name, number } = await req.json();
    if (!type || !name || !number) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const existing = await prisma.paymentMethod.findFirst({
      where: { userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kamu sudah memiliki metode pembayaran" },
        { status: 409 }
      );
    }

    const newMethod = await prisma.paymentMethod.create({
      data: { userId, type, name, number },
    });

    return NextResponse.json(newMethod);
  } catch (error) {
    console.error("POST payment method error:", error);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}