import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const token = (await cookies()).get("vipeysession")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { amount } = requestBody;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Ambil semua video user untuk menghitung earnings secara konsisten
    const videos = await prisma.video.findMany({
      where: { userId },
      select: {
        id: true,
        earnings: true,
        withdrawnEarnings: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    // Hitung total earnings dan withdrawn dari semua video (konsisten dengan /api/payment/balance)
    const totalEarnings = videos.reduce((sum, v) => sum + v.earnings, 0);
    const totalWithdrawn = videos.reduce((sum, v) => sum + v.withdrawnEarnings, 0);
    const available = Math.max(totalEarnings - totalWithdrawn, 0);

    // Filter video yang punya saldo untuk ditarik
    const videosWithBalance = videos.filter(v => (v.earnings - v.withdrawnEarnings) > 0);

    if (videosWithBalance.length === 0) {
      return NextResponse.json({ error: "No balance available to withdraw" }, { status: 400 });
    }

    if (amount > available) {
      return NextResponse.json(
        {
          error: "Requested amount exceeds available balance",
          available,
          requested: amount
        },
        { status: 400 }
      );
    }

    const payout = await prisma.$transaction(async (tx) => {
      let remaining = amount;
      const payoutDetails: { videoId: number; amount: number }[] = [];
      const videoUpdatePromises: Promise<any>[] = [];

      for (const video of videosWithBalance) {
        const availableOnVideo = video.earnings - video.withdrawnEarnings;
        if (availableOnVideo <= 0) continue;

        const withdrawAmount = Math.min(availableOnVideo, remaining);

        if (withdrawAmount > 0) {
          videoUpdatePromises.push(
            tx.video.update({
              where: { id: video.id },
              data: {
                withdrawnEarnings: { increment: withdrawAmount },
              },
            })
          );

          payoutDetails.push({
            videoId: video.id,
            amount: withdrawAmount,
          });

          remaining -= withdrawAmount;
        }

        if (remaining <= 0) break;
      }

      await Promise.all(videoUpdatePromises);

      const payout = await tx.videoPayout.create({
        data: {
          userId,
          amount,
          status: "pending",
        },
      });

      await tx.videoPayoutDetail.createMany({
        data: payoutDetails.map((detail) => ({
          payoutId: payout.id,
          videoId: detail.videoId,
          amount: detail.amount,
        })),
      });

      return payout;
    }, {
      timeout: 30000,
      maxWait: 5000,
    });

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      newBalance: available - amount,
    });
  } catch (err) {
    console.error("POST /api/payment/request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}