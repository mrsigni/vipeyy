"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Clock, Download, Loader2 } from "lucide-react";
import PageBreadcrumb from "../Breads";

type VideoJob = {
  id: string;
  progress: number;
  success: boolean;
  error?: string;
};

export default function FetchFromVideyPage() {
  const [idsInput, setIdsInput] = useState("");
  const [queue, setQueue] = useState<VideoJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [totalVideos, setTotalVideos] = useState(0);

  const handleStart = async () => {
    const ids = idsInput
      .split(/[\s,]+/) // pisah pakai spasi/koma/newline
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) return;

    const initialQueue = ids.map((id) => ({ id, progress: 0, success: false }));
    setQueue(initialQueue);
    setTotalVideos(ids.length);
    setProcessing(true);
    setHasStarted(true);

    // Process videos sequentially
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      await processOne(id);
    }

    setProcessing(false);

    // setelah semua selesai → kosongkan queue setelah 5 detik
    setTimeout(() => {
      setQueue([]);
      setIdsInput("");
      setHasStarted(false);
      setTotalVideos(0);
    }, 5000);
  };

  const processOne = async (videoId: string) => {
    try {
      console.log(`Starting process for video: ${videoId}`);
      
      // Update status menjadi processing untuk video ini saja
      setQueue((prev) =>
        prev.map((job) =>
          job.id === videoId ? { ...job, progress: 0, error: undefined } : job
        )
      );

      // simulasi progress
      for (let i = 1; i <= 100; i++) {
        await new Promise((res) => setTimeout(res, 15));
        setQueue((prev) =>
          prev.map((job) =>
            job.id === videoId ? { ...job, progress: i } : job
          )
        );
      }

      console.log(`Progress completed for video: ${videoId}`);

      const metadata = {
        videoId,
        title: `Video ${videoId}`,
        description: `Imported from Videy on ${new Date().toLocaleDateString()}`,
        thumbnail: null,
        duration: null,
        fileSize: null,
        mimeType: "video/mp4",
        isPublic: true,
      };

      console.log(`Sending API request for video: ${videoId}`, metadata);

      const dbRes = await fetch("/api/upload/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      console.log(`API response status for video ${videoId}:`, dbRes.status);

      if (!dbRes.ok) {
        const dbJson = await dbRes.json();
        console.error(`API error for video ${videoId}:`, dbJson);
        throw new Error(dbJson.error || "Database save failed");
      }

      const result = await dbRes.json();
      console.log(`API result for video ${videoId}:`, result);
      
      if (result.success) {
        console.log(`Setting success for video: ${videoId}`);
        setQueue((prev) =>
          prev.map((job) =>
            job.id === videoId ? { ...job, success: true } : job
          )
        );
        
        // Tidak langsung hapus, biarkan timeout di handleStart yang menangani
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        throw new Error(result.message || "Unknown error");
      }
    } catch (err: any) {
      console.error(`Error processing video ${videoId}:`, err);
      setQueue((prev) =>
        prev.map((job) =>
          job.id === videoId ? { ...job, error: err.message } : job
        )
      );
    }
  };

  // Filter queue untuk hanya menampilkan job yang sedang berjalan atau error
  const activeQueue = queue.filter(job => !job.success);
  
  // Stats untuk tampilan - gunakan totalVideos sebagai acuan utama
  const completedJobs = queue.filter(job => job.success).length;
  const errorJobs = queue.filter(job => job.error).length;
  const activeJobs = queue.filter(job => !job.success && !job.error && job.progress > 0).length;
  const pendingJobs = queue.filter(job => !job.success && !job.error && job.progress === 0).length;

  return (
    <div className="flex flex-col">
      <PageBreadcrumb pageTitle="Ambil Video dari Videy" />

      <div className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-6 text-center font-semibold text-gray-800 text-xl dark:text-white/90">
            Ambil Banyak Video dari Videy
          </h3>

          {/* Form Input - Hanya tampil jika tidak processing */}
          {!processing && (
            <>
              {/* Petunjuk Penggunaan */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Cara Mengambil ID Video
                </h4>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                  <p>1. Buka video di Videy.co</p>
                  <p>2. Salin URL lengkap, contoh:</p>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded border font-mono text-xs">
                    https://videy.co/v/?id=<span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">EMTeLFmB1</span>
                  </div>
                  <p>3. Ambil bagian ID yang di-highlight (setelah "id="):</p>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded border font-mono text-xs font-semibold text-green-600 dark:text-green-400">
                    EMTeLFmB1
                  </div>
                  <p>4. Masukkan ID tersebut ke kolom di bawah ini</p>
                </div>
              </div>

              <textarea
                value={idsInput}
                onChange={(e) => setIdsInput(e.target.value)}
                placeholder="Contoh: EMTeLFmB1&#10;Atau masukkan beberapa ID sekaligus:&#10;EMTeLFmB1&#10;AnotherID&#10;ThirdID"
                className="w-full h-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800 dark:border-gray-600 dark:text-white mb-4 resize-none"
                disabled={processing}
              />

              <button
                onClick={handleStart}
                disabled={!idsInput.trim() || processing}
                className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {processing ? "Processing..." : "Mulai Import"}
              </button>
            </>
          )}

          {/* Progress Summary */}
          {totalVideos > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Progress Summary
              </h4>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Completed: {completedJobs}
                </span>
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 text-blue-500" />
                  Active: {activeJobs}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-500" />
                  Pending: {pendingJobs}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  Failed: {errorJobs}
                </span>
              </div>
              
              {/* Overall progress bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${totalVideos > 0 ? (completedJobs / totalVideos) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {completedJobs} of {totalVideos} videos completed ({Math.round((completedJobs / totalVideos) * 100)}%)
              </p>
            </div>
          )}

          {/* Active Queue (hanya tampilkan job yang sedang berjalan atau error) */}
          {activeQueue.length > 0 && (
            <div className="mt-6 max-h-96 overflow-y-auto space-y-3 pr-2
                            scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
                            dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sticky top-0 bg-white dark:bg-white/[0.03] py-1">
                Current Processing Queue
              </h4>
              
              {activeQueue.map((job, idx) => {
                const originalIndex = queue.findIndex(j => j.id === job.id);
                return (
                  <div
                    key={`${job.id}-${originalIndex}`}
                    className={`p-4 border rounded-xl transition-all duration-300 ${
                      job.success
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                        : job.error
                        ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                        : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        ID: {job.id}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        job.success
                          ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                          : job.error
                          ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      }`}>
                        {job.success ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Success
                          </>
                        ) : job.error ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            Failed
                          </>
                        ) : job.progress > 0 ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            Pending
                          </>
                        )}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          job.success
                            ? "bg-green-500"
                            : job.error
                            ? "bg-red-500"
                            : "bg-gradient-to-r from-blue-400 to-blue-600"
                        }`}
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center">
                      {job.error ? (
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Error: {job.error}
                        </p>
                      ) : job.success ? (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Upload completed successfully!
                          <span className="ml-2 text-gray-500">(removing...)</span>
                        </p>
                      ) : job.progress > 0 ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Uploading... {job.progress}%
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Waiting in queue...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completion message */}
          {!processing && hasStarted && queue.length === 0 && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                All videos have been processed successfully!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}