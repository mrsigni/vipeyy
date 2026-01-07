import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const PER_PAGE = 20;

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("vipeysession")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { userId?: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const userId = payload.userId;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found in token" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const skip = (page - 1) * PER_PAGE;

  try {
    const [total, videos] = await Promise.all([
      prisma.video.count({ where: { userId } }),
      prisma.video.findMany({
        where: { userId },
        select: {
          id: true,
          videoId: true,
          earnings: true,
          totalViews: true,
          createdAt: true,
          lastViewedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: PER_PAGE,
        skip,
      }),
    ]);

    const data = videos.map((v: {
      id: number;
      videoId: string;
      earnings: number;
      totalViews: number;
      createdAt: Date;
      lastViewedAt: Date | null;
    }) => ({
      id: v.id,
      videoId: v.videoId,
      earnings: v.earnings,
      viewCount: v.totalViews,
      createdAt: v.createdAt,
      lastViewedAt: v.lastViewedAt,
    }));

    return NextResponse.json({
      data,
      total,
      perPage: PER_PAGE,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
    });
  } catch (error) {
    console.error("GET /api/video error:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}