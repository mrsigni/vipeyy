import { prisma } from "./prisma";

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
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const views = await prisma.videoView.findMany({
        where: {
            video: { userId },
            createdAt: { gte: startOfYear, lte: endOfYear },
        },
        select: { createdAt: true },
    });

    const monthlyMap = new Map<number, number>();

    views.forEach(({ createdAt }) => {
        const monthIndex = new Date(createdAt).getMonth();
        monthlyMap.set(monthIndex, (monthlyMap.get(monthIndex) ?? 0) + 1);
    });

    const monthlyEarnings = Array.from({ length: 12 }, (_, monthIndex) => {
        const views = monthlyMap.get(monthIndex) ?? 0;
        return (views / 1000) * cpm;
    });

    return monthlyEarnings;
}

export async function getMonthlyMetrics(userId: string, cpm: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const views = await prisma.videoView.findMany({
        where: {
            video: { userId },
            createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { createdAt: true },
    });

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
}
