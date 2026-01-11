"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/context/nasilemak/SidebarContext";
import AppHeader from "../../layout/nasilemak/AppHeader";
import AppSidebar from "../../layout/nasilemak/AppSidebar";
import Backdrop from "../../layout/nasilemak/Backdrop";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch("/api/auth/nasilemak", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!isMounted) return;

        const data = await res.json();
        
        if (res.ok && data.authenticated) {
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
        }
      } catch (err: any) {
        console.error("[NasiLemak] Auth error:", err);
        if (!isMounted) return;
        
        if (err.name === "AbortError") {
          setErrorMsg("Request timeout");
        } else {
          setErrorMsg(err.message || "Connection error");
        }
        setAuthState("error");
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle redirect
  useEffect(() => {
    if (authState === "unauthenticated") {
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
        <p className="mt-4 text-gray-500">Memverifikasi...</p>
      </main>
    );
  }

  if (authState === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-500 mb-2">Gagal terhubung ke server</p>
        <p className="text-gray-500 text-sm mb-4">{errorMsg}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Coba Lagi
        </button>
      </main>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-gray-500">Redirecting...</p>
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