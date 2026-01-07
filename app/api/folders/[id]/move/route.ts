import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// Type guard untuk session
function hasUserId(session: any): session is { user: { id: string } } {
  return session?.user?.id && typeof session.user.id === 'string';
}

// Helper function to check circular references
async function checkCircularReference(folderId: string, newParentId: string): Promise<boolean> {
  let currentParent: string | null = newParentId;
  
  while (currentParent) {
    if (currentParent === folderId) {
      return true; // Circular reference detected
    }
    
    const parent: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentParent },
      select: { parentId: true }
    });
    
    currentParent = parent?.parentId || null;
  }
  
  return false;
}

export async function PUT(
  request: NextRequest,
  ctx: Ctx
) {
  try {
    const session = await getServerSession();
    
    if (!hasUserId(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId: string = session.user.id;
    const { folderId: newParentId }: { folderId?: string | null } = await request.json();
    const { id: folderId } = await ctx.params; // await params sesuai Next.js 15+

    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: userId }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Prevent moving to self
    if (newParentId === folderId) {
      return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });
    }

    // Verify target folder ownership if specified
    if (newParentId) {
      const targetFolder = await prisma.folder.findFirst({
        where: { id: newParentId, userId: userId }
      });

      if (!targetFolder) {
        return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
      }

      // Check for circular reference
      const isCircular: boolean = await checkCircularReference(folderId, newParentId);
      if (isCircular) {
        return NextResponse.json({ error: 'Cannot create circular folder structure' }, { status: 400 });
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: { parentId: newParentId || null },
      include: {
        parent: {
          select: { id: true, name: true }
        },
        user: {
          select: { id: true, fullName: true }
        }
      }
    });

    // Log aktivitas
    console.log(`Folder moved:`, {
      folderId: updatedFolder.id,
      folderName: updatedFolder.name,
      oldParentId: folder.parentId,
      newParentId: updatedFolder.parentId,
      userId: userId,
      movedAt: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Folder moved successfully',
      folder: updatedFolder
    });

  } catch (error) {
    console.error('Error moving folder:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid parent folder reference' },
          { status: 400 }
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