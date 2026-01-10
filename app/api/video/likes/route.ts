import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface LikeRequestBody {
  videoId: string;
  isLike: boolean;
  userId?: string | null;
}

// Get likes and dislikes for a video
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const video = await prisma.video.findFirst({
      where: { videoId },
      select: {
        id: true,
        videoId: true,
        totalLikes: true,
        totalDislikes: true,
      }
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      videoId: video.videoId,
      totalLikes: video.totalLikes || 0,
      totalDislikes: video.totalDislikes || 0,
    });

  } catch (error) {
    console.error('[Video Likes GET Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video likes' },
      { status: 500 }
    );
  }
}

// Add or update like/dislike
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LikeRequestBody = await request.json();
    const { videoId, isLike, userId = null } = body;

    if (!videoId || typeof isLike !== 'boolean') {
      return NextResponse.json(
        { error: 'Video ID and isLike (boolean) are required' },
        { status: 400 }
      );
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() :
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    // Find the video by videoId
    const video = await prisma.video.findFirst({
      where: { videoId }
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check for existing like/dislike - use simpler query
    const existingLike = await prisma.videoLike.findFirst({
      where: {
        videoId: video.id,
        OR: [
          ...(userId ? [{ userId }] : []),
          { ip, userId: null }
        ]
      }
    });

    let action: 'created' | 'updated' | 'removed';
    let likeDelta = 0;
    let dislikeDelta = 0;

    if (existingLike) {
      if (existingLike.isLike === isLike) {
        // Remove the like/dislike (toggle off)
        await prisma.videoLike.delete({
          where: { id: existingLike.id }
        });

        likeDelta = isLike ? -1 : 0;
        dislikeDelta = isLike ? 0 : -1;
        action = 'removed';
      } else {
        // Switch from like to dislike or vice versa
        await prisma.videoLike.update({
          where: { id: existingLike.id },
          data: { isLike, updatedAt: new Date() }
        });

        likeDelta = isLike ? 1 : -1;
        dislikeDelta = isLike ? -1 : 1;
        action = 'updated';
      }
    } else {
      // Create new like/dislike
      await prisma.videoLike.create({
        data: {
          videoId: video.id,
          userId,
          ip,
          isLike,
        }
      });

      likeDelta = isLike ? 1 : 0;
      dislikeDelta = isLike ? 0 : 1;
      action = 'created';
    }

    // Update video totals in a separate query
    const updatedVideo = await prisma.video.update({
      where: { id: video.id },
      data: {
        totalLikes: { increment: likeDelta },
        totalDislikes: { increment: dislikeDelta }
      },
      select: {
        videoId: true,
        totalLikes: true,
        totalDislikes: true,
      }
    });

    return NextResponse.json({
      action,
      isLike,
      videoId: updatedVideo.videoId,
      totalLikes: updatedVideo.totalLikes || 0,
      totalDislikes: updatedVideo.totalDislikes || 0,
    });

  } catch (error) {
    console.error('[Video Likes POST Error]:', error);
    return NextResponse.json(
      { error: 'Failed to process like/dislike' },
      { status: 500 }
    );
  }
}