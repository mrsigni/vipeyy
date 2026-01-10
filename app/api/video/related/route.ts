// app/api/video/related/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const limit = parseInt(searchParams.get("limit") || "6");

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Get related videos (top videos by total views, excluding current video)
    const relatedVideos = await prisma.video.findMany({
      where: {
        videoId: { not: videoId },
        isPublic: true,
      },
      orderBy: {
        totalViews: "desc",
      },
      take: limit,
      select: {
        videoId: true,
        title: true,
        thumbnail: true,
        totalViews: true,
        duration: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({
      videos: relatedVideos,
      count: relatedVideos.length,
    });
  } catch (error) {
    console.error("[Related Videos Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch related videos" },
      { status: 500 }
    );
  }
}
