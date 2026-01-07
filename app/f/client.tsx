"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Folder as FolderIcon, ChevronLeft, Calendar, Play, ChevronRight, Shield, RefreshCw } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";

/* =========================
   Types
   ========================= */
type VideoItem = {
  id: number;
  videoId: string;
  title?: string | null;
  thumbnail?: string | null;
  createdAt: string;
  duration?: number | null;
  totalViews?: number | null;
  earnings?: number | null;
  withdrawnEarnings?: number | null;
  folderId?: string | null;
};

type ChildFolder = {
  id: string;
  name: string;
  color?: string | null;
  parentId?: string | null;
  createdAt: string;
  videoCount: number;
  folderCount: number;
};

type FolderResp = {
  folder: {
    id: string;
    name: string;
    color?: string | null;
    parentId?: string | null;
    createdAt: string;
    videoCount: number;
    totalEarnings: number;
  };
  videos: VideoItem[];
  children: ChildFolder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalVideos: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

/* =========================
   Utils
   ========================= */
const fmtNumber = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString("id-ID") : "0";

const fmtDate = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const fmtDuration = (seconds?: number | null) => {
  if (typeof seconds !== "number" || !isFinite(seconds)) return "0:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}:${remainingMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/* =========================
   Math CAPTCHA Component
   ========================= */
function MathCaptcha({ onVerified }: { onVerified: (verified: boolean) => void }) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);

  const generateQuestion = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    setError('');
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const handleSubmit = () => {
    const correctAnswer = num1 + num2;
    const answer = parseInt(userAnswer, 10);

    if (isNaN(answer)) {
      setError('Mohon masukkan angka yang valid');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (answer === correctAnswer) {
      setIsVerified(true);
      setError('');
      onVerified(true);
    } else {
      setAttempts(prev => prev + 1);
      setError('Jawaban salah. Silakan coba lagi.');
      setUserAnswer('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      if (attempts >= 2) {
        generateQuestion();
        setAttempts(0);
      }
    }
  };

  const handleRefresh = () => {
    generateQuestion();
    setAttempts(0);
  };

  if (isVerified) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-sm animate-fadeIn">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={3} />
        </div>
        <span className="text-xs sm:text-sm text-green-700 font-semibold">
          Verifikasi Berhasil!
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 rounded-2xl shadow-lg ${shake ? 'animate-shake' : ''}`}>
      <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Verifikasi Human
        </h3>
      </div>

      <p className="text-center text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-2">
        Selesaikan perhitungan sederhana untuk melanjutkan
      </p>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl font-bold text-gray-800 bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl border-2 border-gray-200 shadow-sm">
            <span className="text-blue-600">{num1}</span>
            <span className="text-purple-600">+</span>
            <span className="text-blue-600">{num2}</span>
            <span className="text-purple-600">=</span>
            <span className="text-gray-400">?</span>
          </div>
          
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 sm:p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            title="Ganti pertanyaan"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
            placeholder="Masukkan jawaban..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-base sm:text-lg font-semibold transition-all"
            autoComplete="off"
          />
          
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 sm:hover:scale-105"
          >
            Verifikasi
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
            <span className="text-xs sm:text-sm text-red-600 font-medium text-center">{error}</span>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}} />
    </div>
  );
}

/* =========================
   VideoCard
   ========================= */
function VideoCard({ v }: { v: VideoItem }) {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const host =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const videoPageUrl = `${host}/v?id=${encodeURIComponent(v.videoId)}`;
  const thumbUrl = v.thumbnail || `/api/thumb/${encodeURIComponent(v.videoId)}`;

  return (
    <div className="group rounded-lg border bg-white overflow-hidden shadow-sm hover:shadow transition">
      <div className="relative aspect-video bg-gray-200">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0">
            <Skeleton className="w-full h-full rounded-none" />
          </div>
        )}

        <a
          href={`/v?id=${encodeURIComponent(v.videoId)}`}
          className="block w-full h-full relative group"
        >
          {!imgError && thumbUrl ? (
            <img
              src={thumbUrl}
              alt={v.title || v.videoId}
              className={`w-full h-full object-cover ${imgLoaded ? "opacity-100" : "opacity-0"} transition-opacity`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgError(true);
                setImgLoaded(true);
              }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 flex items-center justify-center text-[11px] text-gray-600">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
              <Play className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </a>

        <div className="absolute bottom-1 right-1 flex gap-1 text-[10px] font-medium">
          <span className="px-1.5 py-0.5 rounded bg-black/70 text-white">
            {fmtNumber(v.totalViews)} views
          </span>
          {v.duration && (
            <span className="px-1.5 py-0.5 rounded bg-black/70 text-white">
              {fmtDuration(v.duration)}
            </span>
          )}
        </div>
      </div>

      <div className="p-2">
        <h3 className="font-medium text-sm line-clamp-2" title={v.title || v.videoId}>
          {v.title || v.videoId}
        </h3>
      </div>
    </div>
  );
}

/* =========================
   FolderCard (subfolder)
   ========================= */
function FolderCard({ f }: { f: ChildFolder }) {
  const handleClick = () => {
    window.location.href = `/f?id=${encodeURIComponent(f.id)}`;
  };

  return (
    <div
      onClick={handleClick}
      className="group rounded-lg border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]"
      title={f.name}
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <FolderIcon
            className="w-6 h-6 shrink-0 group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
            style={{ color: f.color || "#f59e0b" }}
          />
          <span className="font-medium text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
            {f.name}
          </span>
        </div>
        
        <div className="mt-2 text-center text-xs text-gray-600 group-hover:text-gray-800 transition-colors">
          {fmtNumber(f.videoCount)} videos
        </div>
      </div>
    </div>
  );
}

/* =========================
   Pagination Component
   ========================= */
function Pagination({ currentPage, totalPages, hasNextPage, hasPreviousPage, onPageChange }: {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}) {
  const getVisiblePages = () => {
    if (totalPages <= 1) return [1];
    
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        rangeWithDots.push(i);
      }
      return rangeWithDots;
    }

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-white rounded border">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        className={`px-3 py-2 rounded border text-sm ${
          hasPreviousPage
            ? "border-gray-300 text-gray-700 hover:bg-gray-50"
            : "border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        ← Prev
      </button>

      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`dots-${index}`} className="px-2 py-2 text-gray-400">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[40px] px-3 py-2 rounded border text-sm ${
                isActive
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className={`px-3 py-2 rounded border text-sm ${
          hasNextPage
            ? "border-gray-300 text-gray-700 hover:bg-gray-50"
            : "border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        Next →
      </button>
    </div>
  );
}

/* =========================
   Halaman Folder (Grid)
   ========================= */
export default function FolderPage() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("id");
  const pageParam = searchParams.get("page");
  const initialPage = pageParam ? parseInt(pageParam, 10) : 1;

  const [loading, setLoading] = useState(true);
  const [copiedFolder, setCopiedFolder] = useState(false);
  const [data, setData] = useState<FolderResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  // Check if user already verified (stored in sessionStorage)
  const [isVerified, setIsVerified] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('humanVerified') === 'true';
    }
    return false;
  });

  const currentFolderUrl =
    typeof window !== "undefined" && folderId
      ? `${window.location.origin}/f?id=${folderId}`
      : "";

  const handlePageChange = async (page: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page.toString());
    window.history.pushState({}, '', url.toString());
    
    setCurrentPage(page);
    
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        const videosSection = document.getElementById('videos-section');
        if (videosSection) {
          videosSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  };

  useEffect(() => {
    if (!folderId) return;
    
    const load = async () => {
      try {
        setLoading(true);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const url = `/api/folders/${folderId}?page=${currentPage}&limit=15`;
        
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'public, max-age=60',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed: ${res.status}`);
        }
        
        const json: FolderResp = await res.json();
        setData(json);
        setError(null);
      } catch (e: any) {
        if (e.name === 'AbortError') {
          setError("Loading timeout. Please refresh the page.");
        } else {
          setError(e?.message || "Gagal memuat folder");
        }
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [folderId, currentPage]);

  const parentHref =
    data?.folder.parentId ? `/f?id=${encodeURIComponent(data.folder.parentId)}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white shadow border-b">
        <div className="max-w-screen-md px-4 mx-auto p-2 flex justify-between items-center">
          <a href="/" className="text-2xl sm:text-3xl font-bold">
            vipey
          </a>
          <nav>
            <ul className="flex items-center text-sm text-gray-800 gap-2 sm:gap-3">
              <li>
                <a href="/advertise" className="hover:text-black transition-colors">
                  Advertise
                </a>
              </li>
              <li>
                <span className="text-gray-400">|</span>
              </li>
              <li>
                <a href="/login" className="hover:text-black transition-colors">
                  Login
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto pt-20 pb-10 px-3">
        {/* CAPTCHA Verification - Only show if not verified */}
        {!isVerified ? (
          <div className="max-w-md mx-auto mt-6 sm:mt-10 px-3 sm:px-0">
            <MathCaptcha onVerified={(verified) => {
              setIsVerified(verified);
              // Store verification in sessionStorage (persists during browser session)
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('humanVerified', 'true');
              }
            }} />
          </div>
        ) : (
          <>
            {/* Loading Skeleton */}
            {loading && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-32 rounded" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-3 h-3 rounded" />
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-8 w-48 rounded" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>

                <div className="mb-2">
                  <Skeleton className="h-5 w-20 rounded mb-2" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`folder-skeleton-${i}`} className="rounded-lg border bg-white overflow-hidden shadow-sm">
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="w-6 h-6 rounded" />
                          <Skeleton className="h-4 w-20 rounded" />
                        </div>
                        <Skeleton className="h-3 w-16 mx-auto rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`video-skeleton-${i}`} className="rounded-lg border bg-white overflow-hidden shadow-sm">
                      <div className="relative aspect-video bg-gray-200">
                        <Skeleton className="w-full h-full rounded-none" />
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          <Skeleton className="h-4 w-12 rounded" />
                          <Skeleton className="h-4 w-16 rounded" />
                        </div>
                      </div>
                      <div className="p-2">
                        <Skeleton className="h-4 w-full rounded mb-1" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 mt-6 p-4 bg-white rounded border">
                  <Skeleton className="h-4 w-24 rounded mr-4" />
                  <Skeleton className="h-9 w-16 rounded" />
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={`page-skeleton-${i}`} className="h-9 w-10 rounded" />
                    ))}
                  </div>
                  <Skeleton className="h-9 w-16 rounded" />
                </div>
              </>
            )}

            {!loading && error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}

            {!loading && !error && data && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    {parentHref && (
                      <a
                        href={parentHref}
                        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Parent Folder
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    {data.folder.color && (
                      <span
                        className="inline-block w-3 h-3 rounded"
                        style={{ backgroundColor: data.folder.color || "#999" }}
                      />
                    )}
                    <FolderIcon className="w-5 h-5 text-amber-500" />
                    <h1 className="text-xl sm:text-2xl font-bold">
                      {data.folder.name}
                    </h1>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>Dibuat: {fmtDate(data.folder.createdAt)}</span>
                    <span>•</span>
                    <span>{data.pagination.totalVideos} video total</span>
                  </div>
                </div>

                <h2 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FolderIcon className="w-4 h-4" />
                  Folder
                </h2>
                {data.children.length === 0 ? (
                  <div className="p-3 rounded border bg-white text-gray-600 mb-6">
                    Tidak ada subfolder.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                    {data.children.map((f) => (
                      <FolderCard key={f.id} f={f} />
                    ))}
                  </div>
                )}

                <div className="scroll-mt-24" id="videos-section">
                  <div className="flex items-center justify-between mb-2 pt-2">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Video
                    </h2>
                    {data.pagination.totalVideos > 0 && (
                      <div className="text-xs text-gray-500">
                        <span className="hidden sm:inline">Halaman {data.pagination.currentPage} dari {data.pagination.totalPages} • </span>
                        <span>{data.pagination.totalVideos} video total</span>
                      </div>
                    )}
                  </div>

                  {loading && currentPage !== initialPage ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={`pagination-skeleton-${i}`} className="rounded-lg border bg-white overflow-hidden shadow-sm">
                          <div className="relative aspect-video bg-gray-200">
                            <Skeleton className="w-full h-full rounded-none" />
                            <div className="absolute bottom-1 right-1 flex gap-1">
                              <Skeleton className="h-4 w-12 rounded" />
                              <Skeleton className="h-4 w-16 rounded" />
                            </div>
                          </div>
                          <div className="p-2">
                            <Skeleton className="h-4 w-full rounded mb-1" />
                            <Skeleton className="h-4 w-3/4 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : data.videos.length === 0 ? (
                    <div className="p-3 rounded border bg-white text-gray-600">
                      {currentPage === 1 
                        ? "Belum ada video di folder ini." 
                        : "Tidak ada video di halaman ini."
                      }
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {data.videos.map((v) => (
                          <VideoCard key={v.id} v={v} />
                        ))}
                      </div>
                      
                      {data.pagination && (
                        <Pagination
                          currentPage={data.pagination.currentPage}
                          totalPages={data.pagination.totalPages}
                          hasNextPage={data.pagination.hasNextPage}
                          hasPreviousPage={data.pagination.hasPreviousPage}
                          onPageChange={handlePageChange}
                        />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      {!loading && isVerified && (
        <footer className="text-center text-xs text-gray-500 mb-6 px-4">
          <p className="font-semibold">
            Copyright &copy; {new Date().getFullYear()} vipey.co
          </p>
          <div className="flex justify-center gap-6 mt-2">
            <a href="/terms-of-service" className="underline">
              Terms of Service
            </a>
            <a href="/report" className="underline">
              Report Abuse
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}