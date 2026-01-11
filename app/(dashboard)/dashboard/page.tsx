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
  let userId: string;
  
  try {
    console.log("[Dashboard] Verifying user...");
    userId = await getUserIdFromCookie();
    console.log("[Dashboard] User verified:", userId);
  } catch (error) {
    console.error("[Dashboard] User verification failed:", error);
    redirect("/login");
  }

  // Fetch data with error handling
  let cpm = 2.0;
  let mainMetrics = { totalEarnings: 0, totalVideos: 0 };
  let todayMetrics = { date: "", views: 0, earnings: 0 };
  let yearlyEarnings = Array.from({ length: 12 }, () => 0);
  let monthlyData: { date: string; views: number; earnings: number }[] = [];

  try {
    console.log("[Dashboard] Fetching CPM...");
    cpm = await getCPM();
    console.log("[Dashboard] CPM:", cpm);
  } catch (error) {
    console.error("[Dashboard] Error fetching CPM:", error);
  }

  try {
    console.log("[Dashboard] Fetching metrics for user:", userId);
    const results = await Promise.allSettled([
      getMainMetrics(userId),
      getTodayMetrics(userId, cpm),
      getYearlyMetrics(userId, cpm),
      getMonthlyMetrics(userId, cpm),
    ]);

    if (results[0].status === "fulfilled") {
      mainMetrics = results[0].value;
      console.log("[Dashboard] Main metrics:", mainMetrics);
    } else {
      console.error("[Dashboard] Main metrics error:", results[0].reason);
    }
    
    if (results[1].status === "fulfilled") {
      todayMetrics = results[1].value;
      console.log("[Dashboard] Today metrics:", todayMetrics);
    } else {
      console.error("[Dashboard] Today metrics error:", results[1].reason);
    }
    
    if (results[2].status === "fulfilled") {
      yearlyEarnings = results[2].value;
    } else {
      console.error("[Dashboard] Yearly metrics error:", results[2].reason);
    }
    
    if (results[3].status === "fulfilled") {
      monthlyData = results[3].value;
    } else {
      console.error("[Dashboard] Monthly metrics error:", results[3].reason);
    }
  } catch (error) {
    console.error("[Dashboard] Error fetching metrics:", error);
  }

  const todayWithCPM = {
    views: todayMetrics.views,
    earnings: cpm > 0 ? (todayMetrics.views / 1000) * cpm : 0,
  };

  console.log("[Dashboard] Rendering with todayWithCPM:", todayWithCPM);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics
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