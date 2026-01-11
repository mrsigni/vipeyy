import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Verify user authentication
    const token = req.cookies.get("vipeysession")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      userId = payload.userId as string;
      if (!userId) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Fetch CPM
    let cpm = 2.0;
    try {
      const settings = await prisma.webSettings.findFirst({
        select: { cpm: true },
      });
      if (settings?.cpm) {
        cpm = settings.cpm;
      }
    } catch (e) {
      console.error("[User Dashboard] Error fetching CPM:", e);
    }

    // Fetch main metrics
    let totalVideos = 0;
    let totalEarnings = 0;
    try {
      const [videoCount, user] = await Promise.all([
        prisma.video.count({ where: { userId } }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { totalEarnings: true },
        }),
      ]);
      totalVideos = videoCount;
      totalEarnings = user?.totalEarnings ?? 0;
    } catch (e) {
      console.error("[User Dashboard] Error fetching main metrics:", e);
    }

    // Fetch user's video IDs
    let videoIds: string[] = [];
    try {
      const userVideos = await prisma.video.findMany({
        where: { userId },
        select: { id: true },
      });
      videoIds = userVideos.map((v) => v.id);
    } catch (e) {
      console.error("[User Dashboard] Error fetching video IDs:", e);
    }

    // Fetch today's views
    let viewsToday = 0;
    try {
      if (videoIds.length > 0) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        viewsToday = await prisma.videoView.count({
          where: {
            videoId: { in: videoIds },
            createdAt: {
              gte: startOfDay,
              lt: nextDay,
            },
          },
        });
      }
    } catch (e) {
      console.error("[User Dashboard] Error fetching today views:", e);
    }

    // Fetch yearly data
    let yearlyEarnings = Array.from({ length: 12 }, () => 0);
    try {
      if (videoIds.length > 0) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

        const views = await prisma.videoView.findMany({
          where: {
            videoId: { in: videoIds },
            createdAt: { gte: startOfYear, lte: endOfYear },
          },
          select: { createdAt: true },
        });

        const monthlyMap = new Map<number, number>();
        views.forEach((view) => {
          const monthIndex = new Date(view.createdAt).getMonth();
          monthlyMap.set(monthIndex, (monthlyMap.get(monthIndex) ?? 0) + 1);
        });

        yearlyEarnings = Array.from({ length: 12 }, (_, monthIndex) => {
          const viewCount = monthlyMap.get(monthIndex) ?? 0;
          return (viewCount / 1000) * cpm;
        });
      }
    } catch (e) {
      console.error("[User Dashboard] Error fetching yearly metrics:", e);
    }

    // Fetch monthly data
    let monthlyData: { date: string; views: number; earnings: number }[] = [];
    try {
      if (videoIds.length > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const views = await prisma.videoView.findMany({
          where: {
            videoId: { in: videoIds },
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          select: { createdAt: true },
        });

        const viewMap = new Map<string, number>();
        views.forEach((view) => {
          const isoDate = view.createdAt.toISOString().split("T")[0];
          viewMap.set(isoDate, (viewMap.get(isoDate) ?? 0) + 1);
        });

        monthlyData = Array.from(viewMap.entries())
          .map(([isoDate, count]) => {
            const date = new Date(isoDate);
            return {
              date: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
              views: count,
              earnings: (count / 1000) * cpm,
              rawDate: isoDate,
            };
          })
          .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
          .map(({ rawDate, ...rest }) => rest);
      }
    } catch (e) {
      console.error("[User Dashboard] Error fetching monthly metrics:", e);
    }

    const earningsToday = (viewsToday / 1000) * cpm;

    return NextResponse.json({
      mainMetrics: {
        totalEarnings,
        totalVideos,
      },
      todayMetrics: {
        views: viewsToday,
        earnings: earningsToday,
      },
      yearlyEarnings,
      monthlyData,
      cpm,
    });
  } catch (error) {
    console.error("[User Dashboard] Error:", error);
    return NextResponse.json(
      {
        mainMetrics: { totalEarnings: 0, totalVideos: 0 },
        todayMetrics: { views: 0, earnings: 0 },
        yearlyEarnings: Array.from({ length: 12 }, () => 0),
        monthlyData: [],
        cpm: 2.0,
      },
      { status: 200 }
    );
  }
}
