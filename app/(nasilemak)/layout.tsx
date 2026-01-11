"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/context/nasilemak/SidebarContext";
import AppHeader from "../../layout/nasilemak/AppHeader";
import AppSidebar from "../../layout/nasilemak/AppSidebar";
import Backdrop from "../../layout/nasilemak/Backdrop";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("[NasiLemak] Starting auth check...");
        
        const res = await fetch("/api/auth/nasilemak", {
          method: "GET",
          credentials: "include",
        });

        console.log("[NasiLemak] Response status:", res.status);

        const data = await res.json();
        console.log("[NasiLemak] Response data:", JSON.stringify(data));
        
        if (res.ok && data.authenticated) {
          console.log("[NasiLemak] Setting authenticated!");
          setAuthState("authenticated");
        } else {
          console.log("[NasiLemak] Not authenticated, will redirect");
          setAuthState("unauthenticated");
        }
      } catch (err) {
        console.error("[NasiLemak] Auth error:", err);
        setAuthState("unauthenticated");
      }
    };

    checkAuth();
  }, []);

  // Handle redirect after state change
  useEffect(() => {
    if (authState === "unauthenticated") {
      console.log("[NasiLemak] Redirecting to /nasi...");
      router.replace("/nasi");
    }
  }, [authState, router]);

  if (authState === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <img
          src="/logo.png"
          alt="Loading..."
          className="h-14 w-auto animate-pulse"
        />
        <p className="mt-4 text-gray-500">Verifying authentication...</p>
      </main>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-gray-500">Redirecting to login...</p>
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