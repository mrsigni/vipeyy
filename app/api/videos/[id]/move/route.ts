import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params; // ✅ harus di-await
    const body = await request.json();
    const { folderId } = body;

    const videoId = parseInt(id);
    if (isNaN(videoId)) {
      return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
    }

    // Cek apakah video ada & milik user
    const video = await prisma.video.findFirst({
      where: { id: videoId, userId },
    });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Validasi folder target (kalau ada)
    if (folderId) {
      const targetFolder = await prisma.folder.findFirst({
        where: { id: String(folderId), userId },
      });

      if (!targetFolder) {
        return NextResponse.json(
          { error: "Target folder not found" },
          { status: 404 }
        );
      }
    }

    // Update folder video
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: { folderId: folderId ? String(folderId) : null },
    });

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error("Error moving video:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
