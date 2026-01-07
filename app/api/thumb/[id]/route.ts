import { NextRequest, NextResponse } from "next/server";
// UBAH INI: Import instance prisma dari file lib/prisma.ts Anda
import { prisma } from "@/lib/prisma"; 

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Gunakan instance prisma yang di-import
    const video = await prisma.video.findUnique({
      where: { videoId: id },
      select: { thumbnail: true }
    });

    if (!video) {
      return generatePlaceholderSVG("Video not found");
    }

    // --- Logika Thumbnail (Sama seperti sebelumnya) ---
    if (video.thumbnail) {
      // 1. Handle HTTP/HTTPS URL
      if (video.thumbnail.startsWith('http')) {
        try {
          const response = await fetch(video.thumbnail, { 
            cache: "no-store" 
          });
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            return new NextResponse(arrayBuffer, {
              status: 200,
              headers: {
                "Content-Type": response.headers.get("content-type") || "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
              },
            });
          }
        } catch (fetchError) {
          console.error("Error fetching thumbnail URL:", fetchError);
          return generatePlaceholderSVG("Thumbnail load error");
        }
      }
      
      // 2. Handle Base64 Data URL
      if (video.thumbnail.startsWith('data:')) {
        const base64Data = video.thumbnail.split(',')[1];
        const mimeType = video.thumbnail.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
        
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": mimeType,
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
            },
          });
        } catch (base64Error) {
          console.error("Error processing base64 thumbnail:", base64Error);
          return generatePlaceholderSVG("Invalid thumbnail data");
        }
      }

      // 3. Handle Relative Path (CDN)
      const CDN_HOST = "https://cdn.videy.co";
      const fullUrl = `${CDN_HOST}/${video.thumbnail}`;
      
      try {
        const response = await fetch(fullUrl, { 
          cache: "no-store" 
        });
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
              "Content-Type": response.headers.get("content-type") || "image/jpeg",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
            },
          });
        }
      } catch (fetchError) {
        console.error("Error fetching thumbnail from CDN:", fetchError);
      }
    }

    return generatePlaceholderSVG("No thumbnail");

  } catch (e) {
    console.error("thumb API error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } 
  
  // PENTING: Jangan ada blok finally { await prisma.$disconnect() } di sini!
}

function generatePlaceholderSVG(message: string = "No thumbnail"): NextResponse {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#e5e7eb" offset="0%"/>
          <stop stop-color="#d1d5db" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <g fill="#6b7280" font-family="sans-serif" font-size="16" text-anchor="middle">
        <circle cx="320" cy="160" r="24" fill="#9ca3af" opacity="0.5"/>
        <path d="M308 152 l8 8 l8 -8 v16 l-8 -8 l-8 8 z" fill="white"/>
        <text x="320" y="210">${message}</text>
      </g>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}