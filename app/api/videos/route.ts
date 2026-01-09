import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Definisikan tipe params untuk dynamic route
type Ctx = { params: Promise<{ id: string }> };

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

    // Ambil ID dari URL params
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

    // Logic parsing fileSize
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

    // Logic parsing duration
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
