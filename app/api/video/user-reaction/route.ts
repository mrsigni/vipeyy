import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UserReactionResponse {
  hasReaction: boolean;
  reaction: 'like' | 'dislike' | null;
  createdAt?: Date;
}

// Get user's current reaction (like/dislike) for a video
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const userId = searchParams.get('userId'); // Optional

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Get client IP for anonymous users
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Find the video
    const video = await prisma.video.findFirst({
      where: { videoId }
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Find user's reaction
    const userReaction = await prisma.videoLike.findFirst({
      where: {
        videoId: video.id,
        ...(userId ? { userId } : { ip, userId: null })
      },
      select: {
        isLike: true,
        createdAt: true,
      }
    });

    if (!userReaction) {
      return NextResponse.json({
        hasReaction: false,
        reaction: null,
      });
    }

    return NextResponse.json({
      hasReaction: true,
      reaction: userReaction.isLike ? 'like' : 'dislike',
      createdAt: userReaction.createdAt,
    });

  } catch (error) {
    console.error('Error fetching user reaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user reaction' },
      { status: 500 }
    );
  }
}