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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalEarnings: true,
        videos: {
          where: {
            earnings: { gt: 0 },
          },
          select: {
            id: true,
            earnings: true,
            withdrawnEarnings: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalWithdrawn = user.videos.reduce(
      (acc, v) => acc + v.withdrawnEarnings,
      0
    );

    const available = user.totalEarnings - totalWithdrawn;

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
      const videoUpdatePromises: Promise<any>[] = []; // Untuk menyimpan promise update video

      for (const video of user.videos) {
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
        data: { // <--- Perbaikan di sini: Hapus satu '{'
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}