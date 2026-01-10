import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { videoCreateSchema } from "@/lib/validation";

const limiter = rateLimit({
  interval: 60 * 60 * 1000,
  uniqueTokenPerInterval: 500,
});

// ✅ GET Videos (List semua video / filter folder)
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

    const where: Record<string, any> = { userId };

    // Logic filter folder
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

    const rateLimitResult = limiter.check(request, 20, `create_video_${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many video creations. Please try again later.",
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      );
    }

    const body = await request.json();
    const result = videoCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.flatten() },
        { status: 400 }
      );
    }

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
    } = result.data;

    const existingVideo = await prisma.video.findUnique({
      where: { videoId: videoId.trim() },
    });

    if (existingVideo) {
      return NextResponse.json({ error: "Video ID already exists" }, { status: 400 });
    }

    // Validasi Folder
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: String(folderId), userId },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    // Validasi File Size
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

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
