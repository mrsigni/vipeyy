import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp
  
  return '0.0.0.0'
}

async function getCountryCode(ip: string): Promise<string | null> {
  if (ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null
  }
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const res = await fetch(`https://ipwhois.app/json/${ip}`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!res.ok) return null
    const data = await res.json()
    return data?.country_code || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { videoId } = body
    
    if (!videoId || typeof videoId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing videoId' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get video and settings in parallel
    const [video, settings] = await Promise.all([
      prisma.video.findUnique({
        where: { videoId },
        select: { id: true, userId: true },
      }),
      prisma.webSettings.findUnique({
        where: { id: 1 },
        select: { cpm: true },
      })
    ])

    if (!video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const ip = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // Check if already viewed today
    const alreadyViewed = await prisma.videoView.findFirst({
      where: {
        videoId: video.id,
        ip,
        createdAt: { gte: today },
      },
      select: { id: true }
    })

    if (alreadyViewed) {
      return new Response(JSON.stringify({ success: false, message: 'Already viewed today' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get country code (non-blocking, don't wait if it times out)
    const country = await getCountryCode(ip)

    // Calculate earning
    const earning = settings?.cpm && video.userId ? settings.cpm / 1000 : 0

    // Execute all updates in parallel
    const updatePromises: Promise<any>[] = [
      // Create view record
      prisma.videoView.create({
        data: {
          videoId: video.id,
          ip,
          userAgent,
          country,
          isValid: true,
        },
      }),
      // Update video stats
      prisma.video.update({
        where: { id: video.id },
        data: {
          totalViews: { increment: 1 },
          lastViewedAt: new Date(),
          ...(earning > 0 ? { earnings: { increment: earning } } : {})
        },
      })
    ]

    // Update user earnings if applicable
    if (earning > 0 && video.userId) {
      updatePromises.push(
        prisma.user.update({
          where: { id: video.userId },
          data: { totalEarnings: { increment: earning } },
        })
      )
    }

    await Promise.all(updatePromises)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[Analytics View Error]:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}