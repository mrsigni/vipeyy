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

export default async function Ecommerce() {
  try {
    const userId = await getUserIdFromCookie();

    const [cpm, mainMetrics, todayMetrics, yearlyEarnings, monthlyData] = await Promise.all([
      getCPM(),
      getMainMetrics(userId),
      getTodayMetrics(userId, 0),
      getYearlyMetrics(userId, 0),
      getMonthlyMetrics(userId, 0),
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
    redirect("/login");
  }
}