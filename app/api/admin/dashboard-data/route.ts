import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const token = req.cookies.get("vipeyadminsession")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (!payload.adminId) {
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
      console.error("Error fetching CPM:", e);
    }

    // Fetch main metrics
    let totalVideos = 0;
    let totalEarnings = 0;
    try {
      const [earningsResult, videoCount] = await Promise.all([
        prisma.user.aggregate({ _sum: { totalEarnings: true } }),
        prisma.video.count(),
      ]);
      totalVideos = videoCount;
      totalEarnings = earningsResult._sum.totalEarnings ?? 0;
    } catch (e) {
      console.error("Error fetching main metrics:", e);
    }

    // Fetch today's views
    let viewsToday = 0;
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      viewsToday = await prisma.videoView.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: nextDay,
          },
        },
      });
    } catch (e) {
      console.error("Error fetching today views:", e);
    }

    // Fetch yearly data
    let yearlyEarnings = Array.from({ length: 12 }, () => 0);
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      const views = await prisma.videoView.findMany({
        where: {
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
    } catch (e) {
      console.error("Error fetching yearly metrics:", e);
    }

    // Fetch monthly data
    let monthlyData: { date: string; views: number; earnings: number }[] = [];
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const views = await prisma.videoView.findMany({
        where: {
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
    } catch (e) {
      console.error("Error fetching monthly metrics:", e);
    }

    return NextResponse.json({
      mainMetrics: {
        totalEarnings,
        totalVideos,
      },
      todayMetrics: {
        views: viewsToday,
        earnings: (viewsToday / 1000) * cpm,
      },
      yearlyEarnings,
      monthlyData,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      {
        mainMetrics: { totalEarnings: 0, totalVideos: 0 },
        todayMetrics: { views: 0, earnings: 0 },
        yearlyEarnings: Array.from({ length: 12 }, () => 0),
        monthlyData: [],
      },
      { status: 200 }
    );
  }
}
