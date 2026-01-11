import type { Metadata } from "next";
import { PlatformOverviewMetrics } from "@/components/ecommerce/nasilemak/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/nasilemak/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/nasilemak/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/nasilemak/StatisticsChart";
import { getCPM } from "@/lib/metrics-service";
import {
  getPlatformMainMetrics,
  getPlatformTodayMetrics,
  getPlatformYearlyMetrics,
  getPlatformMonthlyMetrics,
} from "@/lib/admin-metrics-service";

export const metadata: Metadata = {
  title: "Admin Dashboard | Vipey",
  description: "Platform overview for administrators.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  // Layout already handles authentication, no need to check again here
  
  // Fetch data with error handling
  let cpm = 2.0;
  let mainMetrics = { totalEarnings: 0, totalVideos: 0, totalViews: 0 };
  let todayMetrics = { date: "", views: 0, earnings: 0 };
  let yearlyEarnings = Array.from({ length: 12 }, () => 0);
  let monthlyData: { date: string; views: number; earnings: number }[] = [];

  try {
    cpm = await getCPM();
  } catch (error) {
    console.error("[Admin Dashboard] Error fetching CPM:", error);
  }

  try {
    const results = await Promise.allSettled([
      getPlatformMainMetrics(),
      getPlatformTodayMetrics(cpm),
      getPlatformYearlyMetrics(cpm),
      getPlatformMonthlyMetrics(cpm),
    ]);

    if (results[0].status === "fulfilled") {
      mainMetrics = results[0].value;
    }
    if (results[1].status === "fulfilled") {
      todayMetrics = results[1].value;
    }
    if (results[2].status === "fulfilled") {
      yearlyEarnings = results[2].value;
    }
    if (results[3].status === "fulfilled") {
      monthlyData = results[3].value;
    }
  } catch (error) {
    console.error("[Admin Dashboard] Error fetching metrics:", error);
  }

  const todayWithCPM = {
    views: todayMetrics.views,
    earnings: cpm > 0 ? (todayMetrics.views / 1000) * cpm : 0,
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <PlatformOverviewMetrics
          totalEarnings={mainMetrics.totalEarnings}
          totalVideos={mainMetrics.totalVideos}
        />
        <MonthlySalesChart monthlyEarnings={yearlyEarnings} />
      </div>
      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget
          views={todayWithCPM.views}
          earnings={todayWithCPM.earnings}
          target={100}
        />
      </div>
      <div className="col-span-12">
        <StatisticsChart dailyData={monthlyData} />
      </div>
    </div>
  );
}