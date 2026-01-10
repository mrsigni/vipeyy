import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ParamsPromise = Promise<{ id: string }>;

// GET /api/videos/[id]
export async function GET(req: NextRequest, ctx: { params: ParamsPromise }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const video = await prisma.video.findFirst({
      where: { id: idNum, userId },
      include: { 
        _count: { select: { views: true } },
        folder: {
          select: { id: true, name: true, color: true }
        }
      },
    });
    if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const responseVideo = {
      ...video,
      viewCount: video._count.views,
      availableEarnings: video.earnings - video.withdrawnEarnings,
    };
    return NextResponse.json(responseVideo);
  } catch (e) {
    console.error('Error getting video:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/videos/[id]
export async function PUT(req: NextRequest, ctx: { params: ParamsPromise }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      folderId,
      title,
      description,
      thumbnail,
      duration,
      fileSize,
      mimeType,
      isPublic,
    } = body ?? {};

    const existing = await prisma.video.findFirst({ where: { id: idNum, userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let nextFolderId: string | null | undefined = undefined;
    if (folderId !== undefined) {
      if (folderId === null || folderId === '') {
        nextFolderId = null;
      } else {
        const targetFolder = await prisma.folder.findFirst({
          where: { id: String(folderId), userId },
        });
        if (!targetFolder) {
          return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
        }
        nextFolderId = String(folderId);
      }
    }

    // Prepare fileSize for database - keep as number (Int in schema)
    let fileSizeForDB: number | null | undefined = undefined;
    if (fileSize !== undefined) {
      if (fileSize === null) {
        fileSizeForDB = null;
      } else {
        const parsedSize = typeof fileSize === 'string' ? parseInt(fileSize) : Number(fileSize);
        if (Number.isInteger(parsedSize) && parsedSize >= 0 && parsedSize <= Number.MAX_SAFE_INTEGER) {
          fileSizeForDB = parsedSize; // Keep as number, NOT BigInt
        } else {
          fileSizeForDB = null;
        }
      }
    }

    // Prepare duration
    let durationForDB: number | null | undefined = undefined;
    if (duration !== undefined) {
      if (duration === null) {
        durationForDB = null;
      } else {
        const parsedDuration = Number(duration);
        if (Number.isInteger(parsedDuration) && parsedDuration >= 0) {
          durationForDB = parsedDuration;
        } else {
          durationForDB = null;
        }
      }
    }

    const updated = await prisma.video.update({
      where: { id: idNum },
      data: {
        folderId: nextFolderId,
        title: title !== undefined ? (title?.trim() || null) : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        thumbnail: thumbnail !== undefined ? (thumbnail?.trim() || null) : undefined,
        duration: durationForDB,
        fileSize: fileSizeForDB, // Fixed: now properly typed as number | null | undefined
        mimeType: mimeType !== undefined ? (mimeType?.trim() || null) : undefined,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
      },
      include: {
        folder: {
          select: { id: true, name: true, color: true }
        }
      }
    });

    // Log aktivitas
    console.log(`Video updated:`, {
      videoId: updated.id,
      videoTitle: updated.title || updated.videoId,
      folderId: updated.folderId,
      userId: userId,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Video updated successfully',
      video: updated
    });
  } catch (e) {
    console.error('Error updating video:', e);
    
    // Handle specific Prisma errors
    if (e instanceof Error) {
      if (e.message.includes('Record to update not found')) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
      
      if (e.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid folder reference' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/videos/[id]
export async function DELETE(req: NextRequest, ctx: { params: ParamsPromise }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const existing = await prisma.video.findFirst({ 
      where: { id: idNum, userId },
      include: {
        folder: {
          select: { id: true, name: true }
        }
      }
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete video and all related data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete video views
      await tx.videoView.deleteMany({
        where: { videoId: existing.id }
      });

      // Delete video payout details
      await tx.videoPayoutDetail.deleteMany({
        where: { videoId: existing.id }
      });

      // Delete video payouts
      await tx.videoPayout.deleteMany({
        where: { videoId: existing.id }
      });

      // Delete video
      await tx.video.delete({
        where: { id: existing.id }
      });
    });

    // Log aktivitas
    console.log(`Video deleted:`, {
      videoId: existing.id,
      videoTitle: existing.title || existing.videoId,
      folderId: existing.folderId,
      folderName: existing.folder?.name || 'Root',
      userId: userId,
      deletedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Video deleted successfully',
      deletedVideo: {
        id: existing.id,
        videoId: existing.videoId,
        title: existing.title
      }
    });
  } catch (e) {
    console.error('Error deleting video:', e);
    
    // Handle specific Prisma errors
    if (e instanceof Error) {
      if (e.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}