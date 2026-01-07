"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  VideoIcon,
  DollarLineIcon,
} from "@/icons";

interface PlatformOverviewMetricsProps {
  totalEarnings: number;
  totalVideos: number;
  earningsChange?: number;
  viewsChange?: number;
}

export const PlatformOverviewMetrics = ({
  totalEarnings,
  totalVideos,
  earningsChange,
  viewsChange,
}: PlatformOverviewMetricsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl dark:bg-green-900">
          <DollarLineIcon className="text-green-600 size-6 dark:text-green-400" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Pendapatan Platform
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              ${totalEarnings.toLocaleString()}
            </h4>
          </div>
          {earningsChange !== undefined && (
            <Badge color={earningsChange >= 0 ? "success" : "error"}>
              {earningsChange >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {Math.abs(earningsChange).toFixed(2)}%
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl dark:bg-blue-900">
          <VideoIcon className="text-blue-600 size-6 dark:text-blue-400" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Video di Platform
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {totalVideos.toLocaleString()}
            </h4>
          </div>
          {viewsChange !== undefined && (
            <Badge color={viewsChange >= 0 ? "success" : "error"}>
              {viewsChange >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon className="text-error-500" />}
              {Math.abs(viewsChange).toFixed(2)}%
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
