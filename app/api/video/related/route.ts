// app/api/video/related/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <-- DIUBAH: Impor dari singleton

// DIHAPUS: const prisma = new PrismaClient();

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
        videoId: {
          not: videoId, // Exclude current video
        },
        isPublic: true, // Only show public videos
      },
      orderBy: {
        totalViews: "desc", // Order by total views descending
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
    console.error("Error fetching related videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch related videos" },
      { status: 500 }
    );
  }
  // DIHAPUS: Blok 'finally'
}