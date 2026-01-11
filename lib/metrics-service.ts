import { prisma } from "./prisma";

export async function getCPM(): Promise<number> {
    try {
        let settings = await prisma.webSettings.findFirst({
            select: { cpm: true },
        });
        
        // If no settings exist, create default
        if (!settings) {
            console.log("[Metrics] No webSettings found, creating default...");
            settings = await prisma.webSettings.create({
                data: {
                    id: 1,
                    cpm: 2.0,
                },
                select: { cpm: true },
            });
        }
        
        console.log("[Metrics] CPM fetched:", settings.cpm);
        return settings.cpm ?? 2.0;
    } catch (error) {
        console.error("[Metrics] Error fetching CPM:", error);
        return 2.0; // Default CPM fallback
    }
}

export async function getMainMetrics(userId: string) {
    try {
        console.log("[Metrics] Fetching main metrics for userId:", userId);
        
        const [totalVideos, user] = await Promise.all([
            prisma.video.count({ where: { userId } }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { totalEarnings: true },
            }),
        ]);

        console.log("[Metrics] Main metrics:", { totalVideos, totalEarnings: user?.totalEarnings });

        return {
            totalVideos,
            totalEarnings: user?.totalEarnings ?? 0,
        };
    } catch (error) {
        console.error("[Metrics] Error fetching main metrics:", error);
        return {
            totalVideos: 0,
            totalEarnings: 0,
        };
    }
}

export async function getTodayMetrics(userId: string, cpm: number) {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        console.log("[Metrics] Fetching today metrics for userId:", userId);
        console.log("[Metrics] Date range:", startOfDay, "to", nextDay);

        // First get user's video IDs
        const userVideos = await prisma.video.findMany({
            where: { userId },
            select: { id: true }
        });
        
        const videoIds = userVideos.map(v => v.id);
        console.log("[Metrics] User has", videoIds.length, "videos");

        if (videoIds.length === 0) {
            return {
                date: startOfDay.toISOString().split("T")[0],
                views: 0,
                earnings: 0,
            };
        }

        const viewsToday = await prisma.videoView.count({
            where: {
                videoId: { in: videoIds },
                createdAt: {
                    gte: startOfDay,
                    lt: nextDay,
                },
            },
        });

        console.log("[Metrics] Views today:", viewsToday);

        const earnings = (viewsToday / 1000) * cpm;

        return {
            date: startOfDay.toISOString().split("T")[0],
            views: viewsToday,
            earnings,
        };
    } catch (error) {
        console.error("[Metrics] Error fetching today metrics:", error);
        return {
            date: new Date().toISOString().split("T")[0],
            views: 0,
            earnings: 0,
        };
    }
}

export async function getYearlyMetrics(userId: string, cpm: number) {
    try {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

        // First get user's video IDs
        const userVideos = await prisma.video.findMany({
            where: { userId },
            select: { id: true }
        });
        
        const videoIds = userVideos.map(v => v.id);

        if (videoIds.length === 0) {
            return Array.from({ length: 12 }, () => 0);
        }

        const views = await prisma.videoView.findMany({
            where: {
                videoId: { in: videoIds },
                createdAt: { gte: startOfYear, lte: endOfYear },
            },
            select: { createdAt: true },
        });

        console.log("[Metrics] Yearly views count:", views.length);

        const monthlyMap = new Map<number, number>();

        views.forEach(({ createdAt }) => {
            const monthIndex = new Date(createdAt).getMonth();
            monthlyMap.set(monthIndex, (monthlyMap.get(monthIndex) ?? 0) + 1);
        });

        const monthlyEarnings = Array.from({ length: 12 }, (_, monthIndex) => {
            const viewCount = monthlyMap.get(monthIndex) ?? 0;
            return (viewCount / 1000) * cpm;
        });

        return monthlyEarnings;
    } catch (error) {
        console.error("[Metrics] Error fetching yearly metrics:", error);
        return Array.from({ length: 12 }, () => 0);
    }
}

export async function getMonthlyMetrics(userId: string, cpm: number) {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // First get user's video IDs
        const userVideos = await prisma.video.findMany({
            where: { userId },
            select: { id: true }
        });
        
        const videoIds = userVideos.map(v => v.id);

        if (videoIds.length === 0) {
            return [];
        }

        const views = await prisma.videoView.findMany({
            where: {
                videoId: { in: videoIds },
                createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
            select: { createdAt: true },
        });

        console.log("[Metrics] Monthly views count:", views.length);

        const viewMap = new Map<string, number>();

        views.forEach(({ createdAt }) => {
            const isoDate = createdAt.toISOString().split("T")[0];
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
        console.error("[Metrics] Error fetching monthly metrics:", error);
        return [];
    }
}
