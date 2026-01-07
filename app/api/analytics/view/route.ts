import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

async function getClientIP(req: NextRequest): Promise<string> {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return (req as any)?.ip || '0.0.0.0'
}

async function getCountryCode(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ipwhois.app/json/${ip}`)
    const data = await res.json()
    return data?.country_code || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json()
    if (!videoId || typeof videoId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing videoId' }), { status: 400 })
    }

    const video = await prisma.video.findUnique({
      where: { videoId },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 })
    }

    const ip = await getClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const country = await getCountryCode(ip)

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const alreadyViewed = await prisma.videoView.findFirst({
      where: {
        videoId: video.id,
        ip,
        createdAt: { gte: today },
      },
    })

    if (alreadyViewed) {
      return new Response(JSON.stringify({ success: false, message: 'Already viewed today' }), { status: 200 })
    }

    await prisma.videoView.create({
      data: {
        videoId: video.id,
        ip,
        userAgent,
        country,
        isValid: true,
      },
    })

    await prisma.video.update({
      where: { id: video.id },
      data: {
        totalViews: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })

    const settings = await prisma.webSettings.findUnique({
      where: { id: 1 },
      select: { cpm: true },
    })

    if (settings?.cpm && video.userId) {
      const earning = settings.cpm / 1000

      await prisma.video.update({
        where: { id: video.id },
        data: {
          earnings: { increment: earning },
        },
      })

      await prisma.user.update({
        where: { id: video.userId },
        data: {
          totalEarnings: { increment: earning },
        },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error processing view:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    })
  }
}