"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/context/nasilemak/SidebarContext";
import AppHeader from "../../layout/nasilemak/AppHeader";
import AppSidebar from "../../layout/nasilemak/AppSidebar";
import Backdrop from "../../layout/nasilemak/Backdrop";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<null | boolean>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        console.log("[NasiLemak Layout] Checking auth...");
        
        const res = await fetch("/api/auth/nasilemak", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        console.log("[NasiLemak Layout] Auth response status:", res.status);

        if (!isMounted) return;

        if (!res.ok) {
          console.log("[NasiLemak Layout] Auth response not OK, redirecting...");
          router.replace("/nasi");
          return;
        }

        const data = await res.json();
        console.log("[NasiLemak Layout] Auth data:", data);
        
        if (!data.authenticated) {
          console.log("[NasiLemak Layout] Not authenticated, redirecting...");
          router.replace("/nasi");
        } else {
          console.log("[NasiLemak Layout] Authenticated!");
          setAuthenticated(true);
        }
      } catch (err) {
        console.error("[NasiLemak Layout] Auth check error:", err);
        if (isMounted) {
          setError("Failed to verify authentication");
          // Don't redirect on network error, show error instead
          setTimeout(() => {
            router.replace("/nasi");
          }, 2000);
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-500 mb-4">{error}</p>
        <p className="text-gray-500">Redirecting to login...</p>
      </main>
    );
  }

  if (authenticated === null) {
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