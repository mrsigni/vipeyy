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

    const MIN_PAYOUT = 50.0;

    if (amount < MIN_PAYOUT) {
      return NextResponse.json(
        { error: `Minimum payout amount is $${MIN_PAYOUT}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const pendingPayout = await tx.videoPayout.findFirst({
        where: {
          userId,
          status: "pending",
        },
      });

      if (pendingPayout) {
        throw new Error("PENDING_PAYOUT_EXISTS");
      }

      const videos = await tx.video.findMany({
        where: { userId },
        select: {
          id: true,
          earnings: true,
          withdrawnEarnings: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const totalEarnings = videos.reduce((acc, v) => acc + v.earnings, 0);
      const totalWithdrawn = videos.reduce((acc, v) => acc + v.withdrawnEarnings, 0);
      const available = totalEarnings - totalWithdrawn;

      if (amount > available + 0.001) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      let remaining = amount;
      const payoutDetails = [];
      const videoUpdatePromises = [];

      for (const video of videos) {
        const availableOnVideo = video.earnings - video.withdrawnEarnings;
        if (availableOnVideo <= 0.001) continue;

        const withdrawAmount = Math.min(availableOnVideo, remaining);

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

        if (remaining <= 0.001) break;
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

      return {
        payoutId: payout.id,
        newBalance: available - amount,
      };
    }, {
      timeout: 30000,
      maxWait: 5000,
    });

    return NextResponse.json({
      success: true,
      payoutId: result.payoutId,
      newBalance: result.newBalance,
    });
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Requested amount exceeds available balance" },
        { status: 400 }
      );
    }
    if (err.message === "PENDING_PAYOUT_EXISTS") {
      return NextResponse.json(
        { error: "You already have a pending payout request. Please wait for it to be processed." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}