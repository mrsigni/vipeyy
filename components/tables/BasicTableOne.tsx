"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import toast from "react-hot-toast";
import { Copy, Trash2, Video as VideoIcon, Check } from "lucide-react";
import Badge from "../ui/badge/Badge";

interface Video {
  id: number;
  videoId: string;
  earnings: number;
  viewCount: number;
  createdAt: string;
  lastViewedAt: string | null;
}

export default function VideoTable() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVideos = async (page = 1) => {
    try {
      setLoadingVideos(true);
      const res = await fetch(`/api/video/ambil?page=${page}`);
      const data = await res.json();
      setVideos(data.data);
      setTotalPages(data.totalPages);
    } catch (error) {
      toast.error("Gagal mengambil data video");
      console.error("Fetch error:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos(currentPage);
  }, [currentPage]);

  const confirmDelete = async () => {
    if (!videoToDelete) return;

    try {
      setLoading(true);
      const res = await fetch("/api/video/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: videoToDelete.id }),
      });

      if (!res.ok) throw new Error("Gagal hapus");

      toast.success("Video berhasil dihapus");
      setVideoToDelete(null);
      fetchVideos(currentPage);
    } catch (err) {
      toast.error("Gagal menghapus video");
      console.error("Delete error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (videoId: string, id: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const link = `${baseUrl}/v?id=${videoId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Gagal menyalin link");
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell className="px-4 py-3 text-start text-gray-500 text-theme-xs dark:text-gray-400">
                    Video ID
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-gray-500 text-theme-xs dark:text-gray-400">
                    Earnings
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-gray-500 text-theme-xs dark:text-gray-400">
                    Views
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-gray-500 text-theme-xs dark:text-gray-400">
                    Created At
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-gray-500 text-theme-xs dark:text-gray-400">
                    Last Viewed
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center text-gray-500 text-theme-xs dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="px-4 py-3 text-start flex items-center gap-2 text-theme-sm text-gray-800 dark:text-white">
                      <VideoIcon className="w-4 h-4 text-blue-500" />
                      {video.videoId}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-start text-theme-sm">
                      <Badge>${video.earnings.toLocaleString()}</Badge>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-center text-theme-sm text-gray-800 dark:text-white">
                      {video.viewCount}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-center text-theme-sm text-gray-800 dark:text-white">
                      {new Date(video.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center text-theme-sm text-gray-800 dark:text-white">
                      {video.lastViewedAt
                        ? new Date(video.lastViewedAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "-"}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-center text-theme-sm text-gray-800 dark:text-white">
                      <div className="inline-flex items-center gap-3 justify-center">
                        <button
                          onClick={() =>
                            handleCopyLink(video.videoId, video.id)
                          }
                          title="Salin Link"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {copiedId === video.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <span className="text-gray-400">|</span>

                        <button
                          onClick={() => setVideoToDelete(video)} // ✅ Open modal
                          title="Hapus Video"
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center mt-5 gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-white/[0.1] text-gray-700 dark:text-white bg-white dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.08] disabled:opacity-40 transition"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-2.5 py-1.5 text-xs rounded-md border transition ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-white/[0.1] text-gray-700 dark:text-white bg-white dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.08]"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-white/[0.1] text-gray-700 dark:text-white bg-white dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.08] disabled:opacity-40 transition"
          >
            Next
          </button>
        </div>
      )}

      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
              Konfirmasi Hapus
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Apakah kamu yakin ingin menghapus video{" "}
              <b>{videoToDelete.videoId}</b>?
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setVideoToDelete(null)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}