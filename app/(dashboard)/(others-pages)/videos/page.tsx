import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import VideoTableWithFolders from "@/components/tables/VideoTableWithFolders";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "My Videos | Vipey",
  description: "View and manage all your uploaded videos on Vipey. Track performance, earnings, and more.",
};

export default function VideosPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="My Videos" />
      <div className="space-y-6">
        <VideoTableWithFolders />
      </div>
    </div>
  );
}