import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export async function getCPM(): Promise<number> {
    const settings = await prisma.webSettings.findFirst({
        select: { cpm: true },
    });
    return settings?.cpm ?? 0;
}

export async function getMainMetrics(userId: string) {
    const [totalVideos, user] = await Promise.all([
        prisma.video.count({ where: { userId } }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { totalEarnings: true },
        }),
    ]);

    return {
        totalVideos,
        totalEarnings: user?.totalEarnings ?? 0,
    };
}

export async function getTodayMetrics(userId: string, cpm: number) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const viewsToday = await prisma.videoView.count({
        where: {
            video: { userId },
            createdAt: {
                gte: startOfDay,
                lt: nextDay,
            },
        },
    });

    const earnings = (viewsToday / 1000) * cpm;

    return {
        date: startOfDay.toISOString().split("T")[0],
        views: viewsToday,
        earnings,
    };
}

export async function getYearlyMetrics(userId: string, cpm: number) {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get user's video IDs first
    const userVideos = await prisma.video.findMany({
        where: { userId },
        select: { id: true },
    });
    const videoIds = userVideos.map(v => v.id);

    if (videoIds.length === 0) {
        return Array(12).fill(0);
    }

    // Use raw query for efficient GROUP BY month aggregation
    const results = await prisma.$queryRaw<Array<{ month: number; count: bigint }>>`
        SELECT MONTH(createdAt) as month, COUNT(*) as count
        FROM videoview
        WHERE videoId IN (${Prisma.join(videoIds)})
        AND createdAt >= ${startOfYear}
        AND createdAt <= ${endOfYear}
        GROUP BY MONTH(createdAt)
    `;

    // Create map from results
    const monthlyMap = new Map<number, number>();
    results.forEach(row => {
        monthlyMap.set(row.month, Number(row.count));
    });

    // Generate array for all 12 months
    const monthlyEarnings = Array.from({ length: 12 }, (_, index) => {
        const views = monthlyMap.get(index + 1) ?? 0; // MySQL MONTH() returns 1-12
        return (views / 1000) * cpm;
    });

    return monthlyEarnings;
}

export async function getMonthlyMetrics(userId: string, cpm: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get user's video IDs first
    const userVideos = await prisma.video.findMany({
        where: { userId },
        select: { id: true },
    });
    const videoIds = userVideos.map(v => v.id);

    if (videoIds.length === 0) {
        return [];
    }

    // Use raw query for efficient GROUP BY date aggregation
    const results = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM videoview
        WHERE videoId IN (${Prisma.join(videoIds)})
        AND createdAt >= ${startOfMonth}
        AND createdAt <= ${endOfMonth}
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt) ASC
    `;

    // Transform results
    const result = results.map(row => {
        const dateObj = new Date(row.date);
        const views = Number(row.count);
        return {
            date: dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
            views,
            earnings: (views / 1000) * cpm,
        };
    });

    return result;
}
