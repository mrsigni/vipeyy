import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("vipeyadminsession")?.value;

  if (!sessionToken) {
    return NextResponse.json({ message: "No session found" }, { status: 401 });
  }

  try {
    await prisma.adminSession.deleteMany({
      where: { sessionToken },
    });

    const response = NextResponse.json({ message: "Logout successful" });
    response.cookies.set("vipeyadminsession", "", { maxAge: 0, path: "/" });
    response.cookies.set("vipey_admin", "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    console.error("[LOGOUT_ERROR]", error);
    return NextResponse.json({ message: "Logout failed" }, { status: 500 });
  }
}