import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(
  request: NextRequest,
  ctx: Ctx
) {
  try {
    const { id } = await ctx.params; // await params sesuai Next.js 15+
    
    // Validasi ID
    if (!id) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Validasi format ID (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid folder ID format' },
        { status: 400 }
      );
    }

    // Ambil session untuk autentikasi (uncomment jika diperlukan)
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Cek apakah folder ada dan ambil data terkait
    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true }
        },
        children: {
          select: { id: true, name: true }
        },
        videos: {
          select: { id: true, videoId: true, title: true }
        },
        parent: {
          select: { id: true, name: true }
        }
      }
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Validasi ownership (uncomment jika diperlukan)
    // if (existingFolder.userId !== session.user.id) {
    //   return NextResponse.json(
    //     { error: 'Forbidden: You can only delete your own folders' },
    //     { status: 403 }
    //   );
    // }

    // Cek apakah folder memiliki child folders
    if (existingFolder.children.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete folder: contains subfolders',
          subfolders: existingFolder.children.map(child => ({
            id: child.id,
            name: child.name
          }))
        },
        { status: 409 }
      );
    }

    // Cek apakah folder memiliki videos
    if (existingFolder.videos.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete folder: contains videos',
          videos: existingFolder.videos.map(video => ({
            id: video.id,
            videoId: video.videoId,
            title: video.title || 'Untitled'
          }))
        },
        { status: 409 }
      );
    }

    // Mulai transaction untuk menghapus folder
    const deletedFolder = await prisma.$transaction(async (tx) => {
      // Hapus folder (karena tidak ada children dan videos, ini aman)
      const deleted = await tx.folder.delete({
        where: { id },
        select: {
          id: true,
          name: true,
          userId: true,
          parentId: true,
          createdAt: true
        }
      });

      return deleted;
    });

    // Log aktivitas
    console.log(`Folder deleted:`, {
      folderId: deletedFolder.id,
      folderName: deletedFolder.name,
      userId: deletedFolder.userId,
      parentId: deletedFolder.parentId,
      deletedAt: new Date().toISOString()
    });

    return NextResponse.json(
      { 
        message: 'Folder deleted successfully',
        deletedFolder: {
          id: deletedFolder.id,
          name: deletedFolder.name,
          parentId: deletedFolder.parentId
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting folder:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Cannot delete folder: has dependent data' },
          { status: 409 }
        );
      }

      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Database constraint violation' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative: Force delete dengan cascade (uncomment jika diperlukan)
export async function POST(
  request: NextRequest,
  ctx: Ctx
) {
  try {
    const { force } = await request.json();
    
    if (!force) {
      return NextResponse.json(
        { error: 'Force parameter is required for cascade delete' },
        { status: 400 }
      );
    }

    const { id } = await ctx.params; // await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Cek folder existence
    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: {
        children: true,
        videos: {
          include: {
            views: true,
            payouts: true,
            payoutDetails: true
          }
        }
      }
    });

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Recursive function untuk delete folder dan semua contents
    async function deleteFolderRecursive(folderId: string, tx: any) {
      const folder = await tx.folder.findUnique({
        where: { id: folderId },
        include: {
          children: true,
          videos: {
            include: {
              views: true,
              payouts: true,
              payoutDetails: true
            }
          }
        }
      });

      if (!folder) return;

      // Delete all child folders recursively
      for (const child of folder.children) {
        await deleteFolderRecursive(child.id, tx);
      }

      // Delete all videos in this folder
      for (const video of folder.videos) {
        // Delete video views
        await tx.videoView.deleteMany({
          where: { videoId: video.id }
        });

        // Delete video payout details
        await tx.videoPayoutDetail.deleteMany({
          where: { videoId: video.id }
        });

        // Delete video payouts
        await tx.videoPayout.deleteMany({
          where: { videoId: video.id }
        });

        // Delete video
        await tx.video.delete({
          where: { id: video.id }
        });
      }

      // Finally delete the folder
      await tx.folder.delete({
        where: { id: folderId }
      });
    }

    // Execute cascade delete in transaction
    await prisma.$transaction(async (tx) => {
      await deleteFolderRecursive(id, tx);
    });

    return NextResponse.json(
      { 
        message: 'Folder and all contents deleted successfully',
        deletedFolderId: id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error force deleting folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}