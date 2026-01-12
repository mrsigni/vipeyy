import type { Metadata } from "next";
import { PlatformOverviewMetrics } from "@/components/ecommerce/nasilemak/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/nasilemak/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/nasilemak/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/nasilemak/StatisticsChart";
import { getAdminIdFromCookie } from "@/lib/auth-helpers";
import { getCPM } from "@/lib/metrics-service";
import {
  getPlatformMainMetrics,
  getPlatformTodayMetrics,
  getPlatformYearlyMetrics,
  getPlatformMonthlyMetrics,
} from "@/lib/admin-metrics-service";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Vipey",
  description: "Overview of your account, earnings, video performance, and recent activity on Vipey.",
};

export default async function AdminDashboard() {
  try {
    await getAdminIdFromCookie();

    const [cpm, mainMetrics, todayMetrics, yearlyEarnings, monthlyData] = await Promise.all([
      getCPM(),
      getPlatformMainMetrics(),
      getPlatformTodayMetrics(0),
      getPlatformYearlyMetrics(0),
      getPlatformMonthlyMetrics(0),
    ]);

    const todayWithCPM = {
      views: todayMetrics.views,
      earnings: (todayMetrics.views / 1000) * cpm,
    };

    const yearlyWithCPM = yearlyEarnings.map((_, index) => {
      const monthViews = yearlyEarnings[index] * 1000 / (cpm || 1);
      return (monthViews / 1000) * cpm;
    });

    const monthlyWithCPM = monthlyData.map(item => ({
      ...item,
      earnings: (item.views / 1000) * cpm,
    }));

    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <PlatformOverviewMetrics
            totalEarnings={mainMetrics.totalEarnings}
            totalVideos={mainMetrics.totalVideos}
          />
          <MonthlySalesChart monthlyEarnings={yearlyWithCPM} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget
            views={todayWithCPM.views}
            earnings={todayWithCPM.earnings}
            target={100}
          />
        </div>
        <div className="col-span-12">
          <StatisticsChart dailyData={monthlyWithCPM} />
        </div>
      </div>
    );
  } catch (error) {
    redirect("/admin/login");
  }
}