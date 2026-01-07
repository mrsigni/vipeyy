import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateUniqueFolderSlug } from '@/utils/slugGenerator';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folders = await prisma.folder.findMany({
      where: { userId: userId },
      include: {
        _count: {
          select: {
            videos: true,
            children: true
          }
        },
        videos: {
          select: { earnings: true }
        }
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Add computed fields
    const foldersWithStats = folders.map(folder => ({
      ...folder,
      videoCount: folder._count.videos,
      totalEarnings: folder.videos.reduce((sum, video) => sum + video.earnings, 0)
    }));

    return NextResponse.json(foldersWithStats);

  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, parentId } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Folder name is required' 
      }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return NextResponse.json({ 
        error: 'Folder name must be 100 characters or less' 
      }, { status: 400 });
    }

    // Validate parent folder if provided
    if (parentId) {
      const parentExists = await prisma.folder.findFirst({
        where: { id: String(parentId), userId: userId }
      });

      if (!parentExists) {
        return NextResponse.json({ 
          error: 'Parent folder not found' 
        }, { status: 404 });
      }
    }

    // Check for duplicate names in same parent
    const existingFolder = await prisma.folder.findFirst({
      where: {
        userId: userId,
        name: trimmedName,
        parentId: parentId ? String(parentId) : null
      }
    });

    if (existingFolder) {
      return NextResponse.json({ 
        error: 'Folder name already exists in this location' 
      }, { status: 400 });
    }

    // Generate unique slug for folder ID
    const checkSlugExists = async (slug: string): Promise<boolean> => {
      const existing = await prisma.folder.findUnique({
        where: { id: slug }
      });
      return !!existing;
    };

    // Generate unique slug (12 characters like "cctlmzmrpwkt")
    const folderId = await generateUniqueFolderSlug(checkSlugExists, 12);

    // Get position for new folder
    const lastFolder = await prisma.folder.findFirst({
      where: { 
        userId: userId, 
        parentId: parentId ? String(parentId) : null 
      },
      orderBy: { position: 'desc' }
    });

    const position = (lastFolder?.position || 0) + 1;

    // Create folder with slug as ID
    const folder = await prisma.folder.create({
      data: {
        id: folderId, // Using generated slug as ID
        name: trimmedName,
        color: color ? String(color) : '#3B82F6',
        parentId: parentId ? String(parentId) : null,
        userId: userId,
        position: position
      }
    });

    // Return folder with computed fields
    return NextResponse.json({
      id: folder.id,
      name: folder.name,
      color: folder.color,
      parentId: folder.parentId,
      position: folder.position,
      userId: folder.userId,
      videoCount: 0, // New folder starts with 0 videos
      totalEarnings: 0, // New folder starts with 0 earnings
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      _count: {
        videos: 0,
        children: 0
      },
      videos: []
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}