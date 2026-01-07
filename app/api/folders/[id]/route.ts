import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/* =========================
   Type untuk context params (WAJIB di-await)
   ========================= */
type Ctx = { params: Promise<{ id: string }> };

/* =========================
   GET /api/folders/[id]
   Detail folder + daftar video + daftar subfolder (children)
   ========================= */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id: folderId } = await ctx.params;

    if (!folderId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Extract pagination parameters from URL
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Use Promise.all to run queries in parallel for better performance
    const [folder, totalVideos, videos, children] = await Promise.all([
      // Get folder info
      prisma.folder.findUnique({
        where: { id: folderId },
        select: {
          id: true,
          name: true,
          color: true,
          parentId: true,
          createdAt: true,
          userId: true,
        },
      }),
      
      // Get total video count for pagination
      prisma.video.count({
        where: { folderId: folderId },
      }),
      
      // Get paginated videos with minimal fields for faster loading
      prisma.video.findMany({
        where: { folderId: folderId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          videoId: true,
          title: true,
          thumbnail: true,
          duration: true,
          totalViews: true,
          createdAt: true, // Added createdAt field
          folderId: true,
        },
      }),
      
      // Get subfolders with minimal data
      prisma.folder.findMany({
        where: { parentId: folderId },
        orderBy: { name: 'asc' }, // Name is faster than createdAt
        select: {
          id: true,
          name: true,
          color: true,
          parentId: true,
          createdAt: true,
          _count: {
            select: {
              videos: true,
              children: true,
            },
          },
        },
        take: 20, // Limit subfolder count for performance
      })
    ]);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalVideos / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Calculate total earnings only if needed (remove if not displayed)
    const totalEarnings = 0; // Skip expensive calculation

    return NextResponse.json(
      {
        folder: {
          id: folder.id,
          name: folder.name,
          color: folder.color,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
          videoCount: totalVideos,
          totalEarnings,
        },
        videos: videos.map(video => ({
          ...video,
          createdAt: video.createdAt ? video.createdAt.toISOString() : null,
        })),
        children: children.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          parentId: c.parentId,
          createdAt: c.createdAt.toISOString(),
          videoCount: c._count.videos,
          folderCount: c._count.children,
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalVideos,
          hasNextPage,
          hasPreviousPage,
        },
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Add caching
        }
      }
    );
  } catch (error) {
    console.error('GET /api/folders/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/* =========================
   Helper Functions
   ========================= */
async function checkCircularReference(folderId: string, newParentId: string): Promise<boolean> {
  let currentParent: string | null = newParentId;

  while (currentParent) {
    if (currentParent === folderId) {
      return true;
    }
    const parent: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentParent },
      select: { parentId: true },
    });
    currentParent = parent?.parentId || null;
  }
  return false;
}

/* =========================
   PUT /api/folders/[id]
   ========================= */
export async function PUT(request: NextRequest, ctx: Ctx) {
  console.log('🔄 PUT /api/folders/[id] - Starting...');
  
  try {
    // Use existing auth system
    const userId = await getUserId();
    
    if (!userId) {
      console.log('❌ PUT - Authentication failed');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required. Please login first.',
        suggestion: 'Make sure you are logged in and have a valid session'
      }, { status: 401 });
    }

    const { id: folderId } = await ctx.params;
    console.log('✅ PUT - User authenticated:', userId);
    console.log('🎯 PUT - Folder ID:', folderId);

    const { name, color, parentId }: { name?: string; color?: string; parentId?: string | null } =
      await request.json();

    console.log('📝 PUT - Update data:', { name, color, parentId });

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    
    if (!folder) {
      console.log('❌ PUT - Folder not found or access denied');
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    console.log('✅ PUT - Folder found:', folder.name);

    if (parentId && parentId === folderId) {
      return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });
    }

    if (parentId) {
      const isCircular = await checkCircularReference(folderId, parentId);
      if (isCircular) {
        return NextResponse.json(
          { error: 'Cannot create circular folder structure' },
          { status: 400 }
        );
      }
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId },
      });
      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: name?.trim() || folder.name,
        color: color || folder.color,
        parentId: parentId !== undefined ? parentId : folder.parentId,
      },
    });

    console.log('✅ PUT - Folder updated successfully');
    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error('💥 PUT - Error updating folder:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/* =========================
   DELETE /api/folders/[id] - ENHANCED WITH DETAILED LOGGING
   ========================= */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  console.log('🗑️ DELETE /api/folders/[id] - Starting...');
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  try {
    // Use existing dual auth system
    console.log('🔐 Checking authentication...');
    const userId = await getUserId();
    
    console.log('📋 Auth result:', {
      userId: userId,
      isAuthenticated: !!userId,
      userIdType: typeof userId
    });
    
    if (!userId) {
      console.log('❌ DELETE - Authentication failed - no user ID found');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to delete folders',
        debug: {
          timestamp: new Date().toISOString(),
          endpoint: 'DELETE /api/folders/[id]',
          authResult: 'failed',
          suggestion: 'Please login and try again'
        }
      }, { status: 401 });
    }

    const { id: folderId } = await ctx.params;
    
    console.log('✅ DELETE - User authenticated successfully');
    console.log('👤 User ID:', userId);
    console.log('🎯 Target folder ID:', folderId);

    // Find and verify folder ownership
    console.log('🔍 Looking up folder...');
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      include: { 
        videos: { 
          select: { id: true, videoId: true, title: true } 
        }, 
        children: { 
          select: { id: true, name: true } 
        } 
      },
    });
    
    if (!folder) {
      console.log('❌ DELETE - Folder not found or access denied');
      console.log('🔍 Search criteria:', { folderId, userId });
      return NextResponse.json({ 
        error: 'Folder not found or access denied',
        debug: {
          folderId,
          userId,
          message: 'Either the folder does not exist or you do not have permission to delete it'
        }
      }, { status: 404 });
    }

    console.log('✅ DELETE - Folder found and verified');
    console.log('📁 Folder details:', {
      id: folder.id,
      name: folder.name,
      userId: folder.userId,
      videoCount: folder.videos.length,
      subfolderCount: folder.children.length,
      parentId: folder.parentId
    });

    // Perform deletion with transaction
    console.log('🔄 Starting transaction to delete folder...');
    const transactionStart = Date.now();
    
    await prisma.$transaction([
      // Move videos to parent folder
      prisma.video.updateMany({
        where: { folderId },
        data: { folderId: folder.parentId },
      }),
      // Move subfolders to parent folder
      prisma.folder.updateMany({
        where: { parentId: folderId },
        data: { parentId: folder.parentId },
      }),
      // Delete the folder
      prisma.folder.delete({ where: { id: folderId } }),
    ]);

    const transactionTime = Date.now() - transactionStart;
    console.log('✅ DELETE - Transaction completed successfully');
    console.log('⏱️ Transaction time:', `${transactionTime}ms`);

    const result = {
      success: true,
      message: 'Folder deleted successfully',
      details: {
        deletedFolder: {
          id: folder.id,
          name: folder.name
        },
        movedVideos: folder.videos.length,
        movedSubfolders: folder.children.length,
        movedToParent: folder.parentId || 'root',
        transactionTime: `${transactionTime}ms`
      },
      timestamp: new Date().toISOString()
    };

    console.log('🎉 DELETE - Success response:', result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('💥 DELETE - Critical error occurred:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while deleting the folder',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      debug: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        endpoint: 'DELETE /api/folders/[id]'
      }
    }, { status: 500 });
  }
}