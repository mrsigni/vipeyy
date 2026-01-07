// app/api/video/rename/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const { id, newName } = await req.json();

    if (!id || !newName) {
      return NextResponse.json(
        { error: "Video ID dan nama baru harus diisi" },
        { status: 400 }
      );
    }

    const video = await prisma.video.update({
      where: { id: Number(id) },
      data: { title: newName, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, video });
  } catch (err: any) {
    console.error("Rename video error:", err);
    return NextResponse.json(
      { error: "Gagal rename video", details: err.message },
      { status: 500 }
    );
  }
}
