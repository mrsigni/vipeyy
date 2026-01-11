"use client";

import { useEffect, useState } from "react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";

interface DashboardData {
  mainMetrics: { totalEarnings: number; totalVideos: number };
  todayMetrics: { views: number; earnings: number };
  yearlyEarnings: number[];
  monthlyData: { date: string; views: number; earnings: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/user/dashboard-data", {
          credentials: "include",
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error("Failed to fetch dashboard data");
        }
        
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Error loading dashboard");
        // Set default data on error
        setData({
          mainMetrics: { totalEarnings: 0, totalVideos: 0 },
          todayMetrics: { views: 0, earnings: 0 },
          yearlyEarnings: Array.from({ length: 12 }, () => 0),
          monthlyData: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <div className="text-gray-500">Memuat dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 flex items-center justify-center py-20">
          <div className="text-red-500">{error || "Gagal memuat dashboard"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics
          totalEarnings={data.mainMetrics.totalEarnings}
          totalVideos={data.mainMetrics.totalVideos}
        />
        <MonthlySalesChart monthlyEarnings={data.yearlyEarnings} />
      </div>
      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget
          views={data.todayMetrics.views}
          earnings={data.todayMetrics.earnings}
          target={100}
        />
      </div>
      <div className="col-span-12">
        <StatisticsChart dailyData={data.monthlyData} />
      </div>
    </div>
  );
}