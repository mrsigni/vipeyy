"use client";

import PageBreadcrumb from "../Breads";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UploadVideoPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [videoQueue, setVideoQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const allowedTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) return false;
      if (file.size > 100 * 1024 * 1024) return false;
      return true;
    });

    if (validFiles.length !== files.length) {
      setError("Some files were invalid (format or size > 100MB)");
    } else {
      setError("");
    }

    setVideoQueue(prev => [...prev, ...validFiles]);
  };

  useEffect(() => {
    if (!uploading && videoQueue.length > 0) {
      uploadNextFile();
    }
  }, [videoQueue, uploading]);

  const uploadNextFile = () => {
    const file = videoQueue[0];
    if (!file) return;

    setUploading(true);
    setCurrentFileName(file.name);
    setProgress(0);
    setSuccess(false);
    const visitorId = crypto.randomUUID();

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://videy.co/api/upload?visitorId=${visitorId}`);

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);

          const dbRes = await fetch("/api/upload/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId: data.id }),
          });

          if (!dbRes.ok) {
            const dbJson = await dbRes.json();
            setError(dbJson.error || "Failed to save video info.");
          } else {
            setSuccess(true);
          }
        } catch {
          setError("Invalid response from server.");
        }
      } else {
        setError("Upload to Videy failed.");
      }

      setVideoQueue(prev => prev.slice(1));
      setUploading(false);
    };

    xhr.onerror = () => {
      setError("Upload error occurred.");
      setVideoQueue(prev => prev.slice(1));
      setUploading(false);
    };

    xhr.send(formData);
  };

  return (
    <div className="flex flex-col">
      <PageBreadcrumb pageTitle="Upload Video" />
      <div className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[630px] rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-10">
          <h3 className="mb-4 text-center font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Upload Videos
          </h3>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Upload one or more video files (MP4, MOV, WebM, AVI, MKV) up to 100MB each.
          </p>

          <form onSubmit={e => e.preventDefault()}>
            <div className="mb-6">
              <label
                htmlFor="video"
                className="block w-full cursor-pointer rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <p className="mb-2 text-sm font-semibold">
                  {uploading
                    ? `Uploading: ${currentFileName}`
                    : "Click or drag videos here"}
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  id="video"
                  accept="video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div className="text-center">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? `${progress}%` : "Select Videos"}
              </button>

              {success && (
                <p className="mt-4 text-green-600 font-medium">
                  Upload success
                </p>
              )}

              {videoQueue.length > 0 && !uploading && (
                <p className="mt-2 text-sm text-gray-500">
                  {videoQueue.length} video(s) remaining...
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
