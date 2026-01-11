import { prisma } from "./prisma";

export async function getPlatformMainMetrics() {
    try {
        console.log("[Admin Metrics] Fetching platform main metrics...");
        
        const [earningsResult, totalVideos, totalViews] = await Promise.all([
            prisma.user.aggregate({ _sum: { totalEarnings: true } }),
            prisma.video.count(),
            prisma.videoView.count(),
        ]);

        const result = {
            totalVideos,
            totalEarnings: earningsResult._sum.totalEarnings ?? 0,
            totalViews,
        };
        
        console.log("[Admin Metrics] Platform main metrics:", result);
        return result;
    } catch (error) {
        console.error("[Admin Metrics] Error fetching main metrics:", error);
        return {
            totalVideos: 0,
            totalEarnings: 0,
            totalViews: 0,
        };
    }
}

export async function getPlatformTodayMetrics(cpm: number) {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        console.log("[Admin Metrics] Fetching today metrics...");
        console.log("[Admin Metrics] Date range:", startOfDay, "to", nextDay);

        const viewsToday = await prisma.videoView.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lt: nextDay,
                },
            },
        });

        console.log("[Admin Metrics] Views today:", viewsToday);

        const earnings = (viewsToday / 1000) * cpm;

        return {
            date: startOfDay.toISOString().split("T")[0],
            views: viewsToday,
            earnings,
        };
    } catch (error) {
        console.error("[Admin Metrics] Error fetching today metrics:", error);
        return {
            date: new Date().toISOString().split("T")[0],
            views: 0,
            earnings: 0,
        };
    }
}

export async function getPlatformYearlyMetrics(cpm: number) {
    try {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

        console.log("[Admin Metrics] Fetching yearly metrics...");

        const views = await prisma.videoView.findMany({
            where: {
                createdAt: { gte: startOfYear, lte: endOfYear },
            },
            select: { createdAt: true },
        });

        console.log("[Admin Metrics] Total yearly views:", views.length);

        const monthlyMap = new Map<number, number>();

        views.forEach((view: { createdAt: Date }) => {
            const monthIndex = new Date(view.createdAt).getMonth();
            monthlyMap.set(monthIndex, (monthlyMap.get(monthIndex) ?? 0) + 1);
        });

        const monthlyEarnings = Array.from({ length: 12 }, (_, monthIndex) => {
            const viewCount = monthlyMap.get(monthIndex) ?? 0;
            return (viewCount / 1000) * cpm;
        });

        return monthlyEarnings;
    } catch (error) {
        console.error("[Admin Metrics] Error fetching yearly metrics:", error);
        return Array.from({ length: 12 }, () => 0);
    }
}

export async function getPlatformMonthlyMetrics(cpm: number) {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        console.log("[Admin Metrics] Fetching monthly metrics...");

        const views = await prisma.videoView.findMany({
            where: {
                createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
            select: { createdAt: true },
        });

        console.log("[Admin Metrics] Total monthly views:", views.length);

        const viewMap = new Map<string, number>();

        views.forEach((view: { createdAt: Date }) => {
            const isoDate = view.createdAt.toISOString().split("T")[0];
            viewMap.set(isoDate, (viewMap.get(isoDate) ?? 0) + 1);
        });

        const result = Array.from(viewMap.entries())
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

        return result;
    } catch (error) {
        console.error("[Admin Metrics] Error fetching monthly metrics:", error);
        return [];
    }
}
