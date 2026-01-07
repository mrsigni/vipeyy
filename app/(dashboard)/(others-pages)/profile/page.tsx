import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Profile | Vipey",
  description: "This is the Profile",
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("vipeyy_client");

  let user = {
    fullName: "Guest",
    username: "unknown",
    email: "no-email",
  };

  if (userCookie) {
    try {
      const parsed = JSON.parse(userCookie.value);
      user = {
        fullName: parsed.fullName || "Guest",
        username: parsed.username || "unknown",
        email: parsed.email || "no-email",
      };
    } catch (e) {
      console.error("Failed to parse vipeyy_client cookie", e);
    }
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <div className="flex flex-col items-center space-y-4">
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_URL}/user-default.png`}
              alt="User Avatar"
              className="h-24 w-24 rounded-full border border-gray-300 dark:border-gray-700"
            />
            <div>
              <h3 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white">
                {user.fullName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                @{user.username}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t pt-8 text-left">
            <h4 className="mb-2 text-lg font-semibold text-gray-700 dark:text-white">
              About
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Welcome to your profile page. You can customize this section to show bio, activity logs, or settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
