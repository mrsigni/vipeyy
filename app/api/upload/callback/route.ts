import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { put } from '@vercel/blob';

const JWT_SECRET = process.env.JWT_SECRET!;

interface UploadCallbackData {
  videoId: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  folderId?: string;
  isPublic?: boolean;
}

function convertBase64ToBuffer(base64Data: string): { buffer: Buffer, mimeType: string } | null {
  if (!base64Data) return null;

  const matches = base64Data.match(/^data:(.*);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    try {
      return {
        buffer: Buffer.from(base64Data, 'base64'),
        mimeType: 'image/jpeg'
      };
    } catch (e) {
      return null;
    }
  }

  const mimeType = matches[1];
  const base64 = matches[2];
  const buffer = Buffer.from(base64, 'base64');
  
  return { buffer, mimeType };
}

// Fixed: Return number instead of bigint to match the Int? type in schema
function parseFileSize(sizeInput: any): number | null {
  if (typeof sizeInput === 'number' && sizeInput > 0) {
    // Ensure the value fits within Int range (MySQL INT max: 2,147,483,647)
    return sizeInput <= 2147483647 ? Math.floor(sizeInput) : 2147483647;
  }
  if (typeof sizeInput === 'string') {
    const parsed = parseInt(sizeInput);
    if (isNaN(parsed) || parsed <= 0) return null;
    // Ensure the value fits within Int range
    return parsed <= 2147483647 ? parsed : 2147483647;
  }
  return null;
}

function parseDuration(durationInput: any): number | null {
  if (typeof durationInput === 'number' && durationInput > 0) {
    return Math.floor(durationInput);
  }
  if (typeof durationInput === 'string') {
    const parsed = parseFloat(durationInput);
    return isNaN(parsed) || parsed <= 0 ? null : Math.floor(parsed);
  }
  return null;
}

function validateMimeType(mimeType: any): string {
  if (typeof mimeType !== 'string') return 'video/mp4';
  
  const validVideoMimes = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
    'video/webm', 'video/mkv', 'video/m4v', 'video/3gp', 'video/ogv',
    'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
  ];
  
  const cleanMime = mimeType.toLowerCase().trim();
  return validVideoMimes.includes(cleanMime) ? cleanMime : 'video/mp4';
}

export async function POST(req: NextRequest) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const token = cookieStore.get("vipeysession")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return Response.json({ error: "Invalid session" }, { status: 403 });
    }

    // Parse request body
    const body: UploadCallbackData = await req.json();

    // Validate videoId
    const { videoId } = body;
    if (!videoId || typeof videoId !== 'string') {
      return Response.json({ error: "Missing or invalid videoId" }, { status: 400 });
    }

    // Check if video already exists
    const existingVideo = await prisma.video.findUnique({
      where: { videoId },
      select: { id: true, title: true }
    });

    if (existingVideo) {
      console.log(`Video ${videoId} already exists with title: ${existingVideo.title}`);
      return Response.json({ 
        success: true, 
        message: "Video already exists",
        video: existingVideo
      });
    }

    // Handle thumbnail upload
    let thumbnailUrl: string | null = null;

    if (body.thumbnail && typeof body.thumbnail === 'string') {
      if (body.thumbnail.startsWith('http')) {
        // If already a URL, use it directly
        thumbnailUrl = body.thumbnail;
      } else {
        // If Base64, convert and upload to Vercel Blob
        const converted = convertBase64ToBuffer(body.thumbnail);
        if (converted) {
          const blob = await put(`thumbnails/${videoId}.jpeg`, converted.buffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: converted.mimeType
          });
          thumbnailUrl = blob.url;
        }
      }
    }

    // Process and validate data - now returns Int instead of BigInt
    const videoData: Prisma.VideoUncheckedCreateInput = {
      videoId: videoId.trim(),
      userId: payload.userId,
      folderId: body.folderId?.trim() || null,
      title: body.title?.trim() || `Video ${videoId}`,
      description: body.description?.trim() || null,
      thumbnail: thumbnailUrl,
      duration: parseDuration(body.duration),
      fileSize: parseFileSize(body.fileSize), // Now returns number, not bigint
      mimeType: validateMimeType(body.mimeType),
      isPublic: body.isPublic !== undefined ? Boolean(body.isPublic) : true,
      earnings: 0,
      withdrawnEarnings: 0,
      totalViews: 0
    };

    console.log('Processed video data:', {
      ...videoData,
      thumbnail: videoData.thumbnail ? `[${videoData.thumbnail.length} chars]` : null
    });

    // Save to database
    const video = await prisma.video.create({
      data: videoData,
      select: {
        id: true,
        videoId: true,
        title: true,
        description: true,
        duration: true,
        fileSize: true,
        mimeType: true,
        isPublic: true,
        createdAt: true
      }
    });

    console.log(`Video created successfully: ${video.title} (ID: ${video.videoId})`);

    // Response with created video data
    return Response.json({ 
      success: true,
      message: "Video uploaded and metadata saved successfully",
      video: {
        ...video,
        hasThumbnail: !!videoData.thumbnail
      }
    });

  } catch (err) {
    console.error('Upload callback error:', err);

    return Response.json(
      { 
        error: "Failed to save video metadata", 
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}