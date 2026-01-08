import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface LikeRequestBody {
  videoId: string;
  isLike: boolean;
  userId?: string | null;
}

interface VideoLikeResponse {
  videoId: string;
  totalLikes: number;
  totalDislikes: number;
}

interface LikeActionResponse extends VideoLikeResponse {
  action: 'created' | 'updated' | 'removed';
  isLike: boolean;
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

    // Get video with likes/dislikes
    const video = await prisma.video.findFirst({
      where: { videoId },
      select: {
        id: true,
        videoId: true,
        totalLikes: true,
        totalDislikes: true,
      }
    }) as any; // Temporary fix until migration is complete

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
    console.error('Error fetching video likes:', error);
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
    const ip = forwarded ? forwarded.split(',')[0] :
      request.headers.get('x-real-ip') ||
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

    // Check for existing like/dislike
    const existingLike = await (prisma as any).videoLike.findFirst({
      where: {
        videoId: video.id,
        ...(userId ? { userId } : { ip, userId: null })
      }
    });

    let result: { action: 'created' | 'updated' | 'removed'; isLike: boolean };
    let likeDelta = 0;
    let dislikeDelta = 0;

    if (existingLike) {
      if (existingLike.isLike === isLike) {
        // Remove the like/dislike (toggle off)
        await (prisma as any).videoLike.delete({
          where: { id: existingLike.id }
        });

        if (isLike) {
          likeDelta = -1;
        } else {
          dislikeDelta = -1;
        }

        result = { action: 'removed', isLike };
      } else {
        // Switch from like to dislike or vice versa
        await (prisma as any).videoLike.update({
          where: { id: existingLike.id },
          data: { isLike, updatedAt: new Date() }
        });

        if (isLike) {
          likeDelta = 1;
          dislikeDelta = -1;
        } else {
          likeDelta = -1;
          dislikeDelta = 1;
        }

        result = { action: 'updated', isLike };
      }
    } else {
      // Create new like/dislike
      await (prisma as any).videoLike.create({
        data: {
          videoId: video.id,
          userId,
          ip,
          isLike,
        }
      });

      if (isLike) {
        likeDelta = 1;
      } else {
        dislikeDelta = 1;
      }

      result = { action: 'created', isLike };
    }

    // Update video totals
    const updatedVideo = await prisma.video.update({
      where: { id: video.id },
      data: {
        totalLikes: {
          increment: likeDelta
        },
        totalDislikes: {
          increment: dislikeDelta
        }
      },
      select: {
        videoId: true,
        totalLikes: true,
        totalDislikes: true,
      }
    }) as any; // Temporary fix until migration is complete

    return NextResponse.json({
      ...result,
      videoId: updatedVideo.videoId,
      totalLikes: updatedVideo.totalLikes || 0,
      totalDislikes: updatedVideo.totalDislikes || 0,
    });

  } catch (error) {
    console.error('Error handling video like:', error);
    return NextResponse.json(
      { error: 'Failed to process like/dislike' },
      { status: 500 }
    );
  }
}