import { prisma } from "./prisma";

export async function getPlatformMainMetrics() {
    const [earningsResult, totalVideos] = await Promise.all([
        prisma.user.aggregate({ _sum: { totalEarnings: true } }),
        prisma.video.count(),
    ]);

    return {
        totalVideos,
        totalEarnings: earningsResult._sum.totalEarnings ?? 0,
    };
}

export async function getPlatformTodayMetrics(cpm: number) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const viewsToday = await prisma.videoView.count({
        where: {
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

export async function getPlatformYearlyMetrics(cpm: number) {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Use raw query for efficient GROUP BY month aggregation
    const results = await prisma.$queryRaw<Array<{ month: number; count: bigint }>>`
        SELECT MONTH(createdAt) as month, COUNT(*) as count
        FROM videoview
        WHERE createdAt >= ${startOfYear}
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

export async function getPlatformMonthlyMetrics(cpm: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Use raw query for efficient GROUP BY date aggregation
    const results = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM videoview
        WHERE createdAt >= ${startOfMonth}
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
