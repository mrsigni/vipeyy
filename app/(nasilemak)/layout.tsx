"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/context/nasilemak/SidebarContext";
import AppHeader from "../../layout/nasilemak/AppHeader";
import AppSidebar from "../../layout/nasilemak/AppSidebar";
import Backdrop from "../../layout/nasilemak/Backdrop";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<null | boolean>(null);
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/nasilemak", {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (!data.authenticated) {
          router.replace("/login");
        } else {
          setAuthenticated(true);
        }
      } catch {
        router.replace("/login");
      } finally {
        clearTimeout(timeout);
      }
    };

    checkAuth();
    return () => controller.abort();
  }, [router]);

  if (authenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <img
          src="/logo.png"
          alt="Loading..."
          className="h-14 w-auto animate-pulse"
        />
      </main>
    );
  }

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function NasiLemakLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}