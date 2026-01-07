import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pendingPayouts = await prisma.videoPayout.findMany({
      where: { status: "pending" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            whatsapp: true,
          },
        },
        details: {
          select: {
            videoId: true,
            amount: true,
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
    });

    return NextResponse.json({ pendingPayouts });
  } catch (error) {
    console.error("[ADMIN] Failed to fetch pending payouts:", error);
    return NextResponse.json({ error: "Failed to load pending payouts" }, { status: 500 });
  }
}