import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// ✅ GET Videos dengan pagination (15 per halaman) + FIX: root hanya video tanpa folder
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const take = 15;
    const skip = (page - 1) * take;

    // 🔧 Filter folder: jika folderId kosong => hanya video root (folderId = null)
    // jika folderId ada => hanya video dalam folder tsb
    const where: Record<string, any> = { userId };
    if (folderId && folderId !== "null" && folderId !== "") {
      where.folderId = folderId;
    } else {
      where.folderId = null;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        skip,
        take,
        include: {
          folder: { select: { id: true, name: true, color: true } },
          _count: { select: { views: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.video.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    const formattedVideos = videos.map((video) => ({
      ...video,
      viewCount: video._count.views,
      availableEarnings: video.earnings - video.withdrawnEarnings,
    }));

    return NextResponse.json({
      data: formattedVideos,
      page,
      totalPages,
      total,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ POST Create Video
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      videoId,
      title,
      description,
      folderId,
      thumbnail,
      duration,
      fileSize,
      mimeType,
      isPublic,
    } = body;

    if (!videoId || typeof videoId !== "string" || videoId.trim().length === 0) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    const existingVideo = await prisma.video.findUnique({
      where: { videoId: videoId.trim() },
    });

    if (existingVideo) {
      return NextResponse.json({ error: "Video ID already exists" }, { status: 400 });
    }

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: String(folderId), userId },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    let fileSizeForDB: number | null = null;
    if (fileSize !== undefined && fileSize !== null) {
      const parsedSize = typeof fileSize === "string" ? parseInt(fileSize, 10) : fileSize;
      if (
        Number.isInteger(parsedSize) &&
        parsedSize >= 0 &&
        parsedSize <= Number.MAX_SAFE_INTEGER
      ) {
        fileSizeForDB = parsedSize;
      }
    }

    const video = await prisma.video.create({
      data: {
        videoId: videoId.trim(),
        userId,
        folderId: folderId ? String(folderId) : null,
        title: title?.trim() || null,
        description: description?.trim() || null,
        thumbnail: thumbnail?.trim() || null,
        duration: duration && Number.isInteger(duration) ? duration : null,
        fileSize: fileSizeForDB,
        mimeType: mimeType?.trim() || null,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      },
      include: {
        folder: { select: { id: true, name: true, color: true } },
      },
    });

    console.log("Video created:", {
      videoId: video.id,
      title: video.title || video.videoId,
      userId,
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// ✅ PUT Update Video (dynamic via ctx.params)
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      folderId,
      thumbnail,
      duration,
      fileSize,
      mimeType,
      isPublic,
    } = body;

    const { id } = await ctx.params;
    const videoId = parseInt(id, 10);

    if (isNaN(videoId)) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    const existingVideo = await prisma.video.findFirst({
      where: { id: videoId, userId },
    });
    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    let fileSizeForDB: number | null | undefined = undefined;
    if (fileSize !== undefined) {
      if (fileSize === null) fileSizeForDB = null;
      else {
        const parsedSize =
          typeof fileSize === "string" ? parseInt(fileSize, 10) : Number(fileSize);
        if (
          Number.isInteger(parsedSize) &&
          parsedSize >= 0 &&
          parsedSize <= Number.MAX_SAFE_INTEGER
        ) {
          fileSizeForDB = parsedSize;
        } else {
          fileSizeForDB = null;
        }
      }
    }

    let durationForDB: number | null | undefined = undefined;
    if (duration !== undefined) {
      if (duration === null) durationForDB = null;
      else {
        const parsedDuration = Number(duration);
        if (Number.isInteger(parsedDuration) && parsedDuration >= 0) {
          durationForDB = parsedDuration;
        }
      }
    }

    const updated = await prisma.video.update({
      where: { id: videoId },
      data: {
        title: title !== undefined ? (title?.trim() || null) : undefined,
        description:
          description !== undefined ? (description?.trim() || null) : undefined,
        folderId:
          folderId !== undefined ? (folderId ? String(folderId) : null) : undefined,
        thumbnail: thumbnail !== undefined ? (thumbnail?.trim() || null) : undefined,
        duration: durationForDB,
        fileSize: fileSizeForDB,
        mimeType: mimeType !== undefined ? (mimeType?.trim() || null) : undefined,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
      },
      include: {
        folder: { select: { id: true, name: true, color: true } },
      },
    });

    console.log("Video updated:", {
      videoId: updated.id,
      title: updated.title || updated.videoId,
      userId,
    });

    return NextResponse.json({ message: "Video updated", video: updated });
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
