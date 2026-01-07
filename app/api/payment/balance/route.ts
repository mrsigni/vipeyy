import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    const userId = payload.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const videos = await prisma.video.findMany({
      where: { userId },
      select: {
        earnings: true,
        withdrawnEarnings: true,
      },
    });

    const totalEarnings = videos.reduce((sum, v) => sum + v.earnings, 0);
    const totalWithdrawn = videos.reduce((sum, v) => sum + v.withdrawnEarnings, 0);
    const availableToWithdraw = Math.max(totalEarnings - totalWithdrawn, 0);

    return NextResponse.json({
      totalEarnings,
      totalWithdrawn,
      availableToWithdraw,
    });
  } catch (error) {
    console.error("GET /api/payment/balance error:", error);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
