import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vipeysession")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const userId = payload.userId;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = parseInt(body.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        earnings: true
      }
    });

    if (!video || video.userId !== userId) {
      return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });
    }

    // Delete video and decrement user earnings in transaction
    await prisma.$transaction(async (tx) => {
      // CRITICAL: Decrement user total earnings first
      if (video.earnings > 0) {
        await tx.user.update({
          where: { id: video.userId },
          data: {
            totalEarnings: { decrement: video.earnings },
          },
        });
      }

      // Then delete the video (cascade will handle related records)
      await tx.video.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE video error:", err);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}