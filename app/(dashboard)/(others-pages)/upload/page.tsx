"use client";

import PageBreadcrumb from "../Breads";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface VideoFile extends File {
  duration?: number;
  thumbnail?: string;
  extractedTitle?: string;
}

interface VideoMetadata {
  duration: number;
  thumbnail: string;
  title: string;
}

export default function UploadVideoPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [videoQueue, setVideoQueue] = useState<VideoFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [extractingMetadata, setExtractingMetadata] = useState(false);

  const allowedTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/x-matroska",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/m4v",
    "video/3gp",
    "video/ogv"
  ];

  // Fungsi untuk extract metadata dari video file
  const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = () => {
        const videoDuration = Math.floor(video.duration);
        
        // Set canvas size berdasarkan video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        
        // Seek ke detik ke-5 atau 10% dari duration untuk thumbnail
        const seekTime = Math.min(5, videoDuration * 0.1);
        video.currentTime = seekTime;
      };
      
      video.onseeked = () => {
        if (ctx) {
          // Draw video frame ke canvas untuk thumbnail
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas ke data URL
          const thumbnailData = canvas.toDataURL('image/jpeg', 0.8);
          
          // Generate title dari nama file
          const videoTitle = file.name.replace(/\.[^/.]+$/, "") // Remove extension
                                .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
                                .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')
                                .trim() || `Video ${Date.now()}`;
          
          resolve({
            duration: Math.floor(video.duration) || 0,
            thumbnail: thumbnailData,
            title: videoTitle
          });
        } else {
          // Fallback jika canvas tidak support
          resolve({
            duration: Math.floor(video.duration) || 0,
            thumbnail: '',
            title: file.name.replace(/\.[^/.]+$/, "") || `Video ${Date.now()}`
          });
        }
        
        // Cleanup
        video.remove();
        canvas.remove();
      };
      
      video.onerror = () => {
        // Fallback untuk error
        resolve({
          duration: 0,
          thumbnail: '',
          title: file.name.replace(/\.[^/.]+$/, "") || `Video ${Date.now()}`
        });
        video.remove();
        canvas.remove();
      };
      
      // Load video file
      video.src = URL.createObjectURL(file);
    });
  };

  // Fungsi untuk memproses file dan extract metadata
  const processFiles = async (files: File[]) => {
    setExtractingMetadata(true);
    const processedFiles: VideoFile[] = [];
    
    for (const file of files) {
      try {
        const metadata = await extractVideoMetadata(file);
        const processedFile = file as VideoFile;
        processedFile.duration = metadata.duration;
        processedFile.thumbnail = metadata.thumbnail;
        processedFile.extractedTitle = metadata.title;
        processedFiles.push(processedFile);
      } catch (error) {
        console.error(`Error extracting metadata for ${file.name}:`, error);
        // Add file without metadata as fallback
        const processedFile = file as VideoFile;
        processedFile.extractedTitle = file.name.replace(/\.[^/.]+$/, "");
        processedFiles.push(processedFile);
      }
    }
    
    setExtractingMetadata(false);
    return processedFiles;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) return false;
      if (file.size > 100 * 1024 * 1024) return false; // 100MB limit
      return true;
    });

    if (validFiles.length !== files.length) {
      setError("Some files were invalid (unsupported format or size > 100MB)");
    } else {
      setError("");
    }

    if (validFiles.length > 0) {
      setError("Extracting video metadata...");
      const processedFiles = await processFiles(validFiles);
      setError("");
      setVideoQueue(prev => [...prev, ...processedFiles]);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!uploading && !extractingMetadata && videoQueue.length > 0) {
      uploadNextFile();
    }
  }, [videoQueue, uploading, extractingMetadata]);

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

          // Prepare metadata untuk callback API dengan fallbacks
          const callbackData = {
            videoId: data.id,
            title: file.extractedTitle || file.name.replace(/\.[^/.]+$/, "") || `Video ${data.id}`,
            description: `Uploaded on ${new Date().toLocaleDateString()}`,
            thumbnail: file.thumbnail || null,
            duration: file.duration || null,
            fileSize: file.size || null,
            mimeType: file.type || 'video/mp4',
            isPublic: true
          };

          console.log('=== UPLOAD DEBUG ===');
          console.log('File info:', {
            name: file.name,
            size: file.size,
            type: file.type,
            extractedTitle: file.extractedTitle,
            duration: file.duration,
            hasThumbnail: !!file.thumbnail
          });
          console.log('Callback data being sent:', {
            ...callbackData,
            thumbnail: callbackData.thumbnail ? `[Base64 ${callbackData.thumbnail.length} chars]` : null
          });

          const dbRes = await fetch("/api/upload/callback", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(callbackData),
          });

          console.log('Callback response status:', dbRes.status);
          
          if (!dbRes.ok) {
            const dbJson = await dbRes.json();
            console.error('Callback error response:', dbJson);
            setError(`Database save failed: ${dbJson.error || "Unknown error"}`);
          } else {
            const result = await dbRes.json();
            console.log('Callback success response:', result);
            
            if (result.success) {
              setSuccess(true);
              console.log('Video saved with metadata:', result.video);
            } else {
              setError(`Callback failed: ${result.message || "Unknown error"}`);
            }
          }
        } catch (err) {
          console.error('JSON parse or callback error:', err);
          setError("Invalid response from server or callback failed.");
        }
      } else {
        console.error('Upload to Videy failed:', xhr.status, xhr.statusText);
        setError(`Upload to Videy failed: ${xhr.status} ${xhr.statusText}`);
      }

      setVideoQueue(prev => prev.slice(1));
      setUploading(false);
    };

    xhr.onerror = () => {
      console.error('Upload network error');
      setError("Upload network error occurred.");
      setVideoQueue(prev => prev.slice(1));
      setUploading(false);
    };

    xhr.send(formData);
  };

  const removeFromQueue = (index: number) => {
    setVideoQueue(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col">
      <PageBreadcrumb pageTitle="Upload Video" />
      <div className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[800px] rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] sm:p-10">
          <h3 className="mb-4 text-center font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Upload Videos
          </h3>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Upload multiple video files with automatic metadata extraction. Supported formats: MP4, MOV, WebM, AVI, MKV (max 100MB each).
          </p>

          <form onSubmit={e => e.preventDefault()}>
            <div className="mb-6">
              <label
                htmlFor="video"
                className={`block w-full cursor-pointer rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 ${uploading || extractingMetadata ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm font-semibold">
                    {extractingMetadata
                      ? "Extracting metadata..."
                      : uploading
                      ? `Uploading: ${currentFileName} (${progress}%)`
                      : "Click or drag videos here"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Auto-extract title, duration, and thumbnail
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  id="video"
                  accept="video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading || extractingMetadata}
                />
              </label>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            {/* Enhanced Upload Queue Display with Better Scrolling */}
            {videoQueue.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Upload Queue ({videoQueue.length} videos)
                  </h4>
                  {videoQueue.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                      Scroll to view more
                    </div>
                  )}
                </div>
                
                {/* Improved scrollable container */}
                <div className="relative">
                  <div 
                    className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 pr-2"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgb(209 213 219) rgb(243 244 246)'
                    }}
                  >
                    <div className="space-y-3">
                      {videoQueue.map((file, index) => (
                        <div
                          key={index}
                          className={`relative flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
                            index === 0 && uploading 
                              ? 'bg-blue-50 border-2 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' 
                              : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750'
                          }`}
                        >
                          {/* Upload progress bar for current file */}
                          {index === 0 && uploading && (
                            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-xl transition-all duration-300" 
                                 style={{ width: `${progress}%` }} />
                          )}
                          
                          <div className="flex items-center space-x-4 flex-1 min-w-0">
                            {/* Queue position indicator */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              index === 0 && uploading 
                                ? 'bg-blue-500 text-white' 
                                : index === 0 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                            }`}>
                              {index === 0 && uploading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : index + 1}
                            </div>
                            
                            {/* Thumbnail */}
                            {file.thumbnail && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={file.thumbnail} 
                                  alt="Thumbnail"
                                  className="w-16 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                />
                              </div>
                            )}
                            
                            {/* File info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                                {file.extractedTitle || file.name}
                              </p>
                              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                                  </svg>
                                  {formatFileSize(file.size)}
                                </span>
                                {file.duration && (
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDuration(file.duration)}
                                  </span>
                                )}
                                {file.type && (
                                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs uppercase">
                                    {file.type.split('/')[1]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Status and actions */}
                          <div className="flex-shrink-0 flex items-center space-x-2">
                            {index === 0 && uploading ? (
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {progress}%
                              </div>
                            ) : (
                              <>
                                {index === 0 && (
                                  <div className="text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                                    Next
                                  </div>
                                )}
                                <button
                                  onClick={() => removeFromQueue(index)}
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  disabled={uploading || extractingMetadata}
                                  title="Remove from queue"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Scroll indicators */}
                  {videoQueue.length > 3 && (
                    <>
                      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white dark:from-gray-900 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                disabled={uploading || extractingMetadata}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {extractingMetadata
                  ? "Processing..."
                  : uploading
                  ? `Uploading... ${progress}%`
                  : "Add More Videos"
                }
              </button>

              {success && (
                <p className="mt-4 text-green-600 font-medium">
                  ✓ Upload completed successfully!
                </p>
              )}

              {videoQueue.length > 0 && !uploading && !extractingMetadata && (
                <p className="mt-2 text-sm text-gray-500">
                  {videoQueue.length} video(s) in queue
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
      
    </div>
  );
}