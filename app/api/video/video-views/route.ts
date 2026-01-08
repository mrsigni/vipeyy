import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const videoId = new URL(req.url).searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 })
    }

    const totalViews = await prisma.video
      .findUnique({
        where: { videoId },
        select: { totalViews: true },
      })
      .then((v: { totalViews: number } | null) => v?.totalViews)

    if (totalViews === undefined) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    return NextResponse.json({ totalViews })
  } catch (err) {
    console.error('[video-views] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}