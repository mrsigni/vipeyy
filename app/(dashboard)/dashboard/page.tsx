import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import { getUserIdFromCookie } from "@/lib/auth-helpers";
import {
  getCPM,
  getMainMetrics,
  getTodayMetrics,
  getYearlyMetrics,
  getMonthlyMetrics,
} from "@/lib/metrics-service";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Vipey",
  description: "Overview of your account, earnings, video performance, and recent activity on Vipey.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Ecommerce() {
  try {
    console.log("[Dashboard] Loading dashboard...");
    
    const userId = await getUserIdFromCookie();
    console.log("[Dashboard] Got userId:", userId);

    const cpm = await getCPM();
    console.log("[Dashboard] CPM value:", cpm);

    const [mainMetrics, todayMetrics, yearlyEarnings, monthlyData] = await Promise.all([
      getMainMetrics(userId),
      getTodayMetrics(userId, cpm),
      getYearlyMetrics(userId, cpm),
      getMonthlyMetrics(userId, cpm),
    ]);

    console.log("[Dashboard] Main metrics:", mainMetrics);
    console.log("[Dashboard] Today metrics:", todayMetrics);

    const todayWithCPM = {
      views: todayMetrics.views,
      earnings: cpm > 0 ? (todayMetrics.views / 1000) * cpm : 0,
    };

    const yearlyWithCPM = yearlyEarnings.map((earning, index) => {
      // If cpm was 0 during fetch, recalculate
      return earning;
    });

    const monthlyWithCPM = monthlyData.map(item => ({
      ...item,
      earnings: cpm > 0 ? (item.views / 1000) * cpm : item.earnings,
    }));

    console.log("[Dashboard] Today with CPM:", todayWithCPM);

    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics
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
    console.error("[Dashboard] Error loading dashboard:", error);
    redirect("/login");
  }
}