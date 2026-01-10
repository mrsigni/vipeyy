"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Share,
  Loader2,
  Check,
  SkipBack,
  SkipForward,
  AlertCircle,
  PictureInPicture2,
  Eye,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import Turnstile from "@/components/common/Turnstile";

type RelatedVideo = {
  videoId: string;
  title?: string | null;
  thumbnail?: string | null;
  duration?: number | null;
  totalViews?: number | null;
  createdAt?: string | null;
};

export default function ModernVideoPlayer() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [mounted, setMounted] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);

  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [videoRatio, setVideoRatio] = useState<"landscape" | "portrait">("landscape");
  const [videoError, setVideoError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const [totalLikes, setTotalLikes] = useState(0);
  const [totalDislikes, setTotalDislikes] = useState(0);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [isReactionLoading, setIsReactionLoading] = useState(false);

  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);

  const [currentUrl, setCurrentUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
  const shouldUseTurnstile = process.env.NEXT_PUBLIC_TURNSTILE === "true";
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(!shouldUseTurnstile);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    if (shouldUseTurnstile && typeof window !== 'undefined') {
      const existingScript = document.getElementById('turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, [shouldUseTurnstile]);

  useEffect(() => {
    if (id && typeof window !== "undefined") {
      setVideoUrl(`https://cdn.videy.co/${id}.mp4`);
      setCurrentUrl(window.location.href);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (shouldUseTurnstile && !isTurnstileVerified) return;

    const fetchVideoDetails = async () => {
      try {
        const response = await fetch(`/api/video/details?videoId=${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setVideoTitle(data.title);
            setViewCount(data.totalViews || 0);
            setTotalLikes(data.totalLikes || 0);
            setTotalDislikes(data.totalDislikes || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching video details:", error);
      }
    };

    const fetchUserReaction = async () => {
      try {
        const reactionResponse = await fetch(`/api/video/user-reaction?videoId=${id}`);
        if (reactionResponse.ok) {
          const reactionData = await reactionResponse.json();
          if (reactionData.hasReaction) {
            setUserReaction(reactionData.reaction);
          }
        }
      } catch (error) {
        console.error('Error fetching user reaction:', error);
      }
    };

    fetchVideoDetails();
    fetchUserReaction();
  }, [id, isTurnstileVerified, shouldUseTurnstile]);

  useEffect(() => {
    if (!id) return;
    if (shouldUseTurnstile && !isTurnstileVerified) return;

    fetch(`/api/video/related?videoId=${id}&limit=12`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error && Array.isArray(data.videos)) setRelatedVideos(data.videos);
      })
      .catch((err) => console.error("Failed to fetch related videos:", err))
      .finally(() => setLoadingRelated(false));
  }, [id, isTurnstileVerified, shouldUseTurnstile]);

  const handleReaction = async (isLike: boolean) => {
    if (!id || isReactionLoading) return;

    setIsReactionLoading(true);

    try {
      const response = await fetch('/api/video/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: id,
          isLike,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setTotalLikes(data.totalLikes);
        setTotalDislikes(data.totalDislikes);

        if (data.action === 'removed') {
          setUserReaction(null);
        } else {
          setUserReaction(isLike ? 'like' : 'dislike');
        }
      } else {
        console.error('Failed to update reaction');
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    } finally {
      setIsReactionLoading(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;

    const handlePipEnter = () => setIsPictureInPicture(true);
    const handlePipLeave = () => setIsPictureInPicture(false);

    const pipVideo = video as HTMLVideoElement & {
      addEventListener(
        type: "enterpictureinpicture" | "leavepictureinpicture",
        listener: () => void
      ): void;
      removeEventListener(
        type: "enterpictureinpicture" | "leavepictureinpicture",
        listener: () => void
      ): void;
    };

    pipVideo.addEventListener("enterpictureinpicture", handlePipEnter);
    pipVideo.addEventListener("leavepictureinpicture", handlePipLeave);

    return () => {
      pipVideo.removeEventListener("enterpictureinpicture", handlePipEnter);
      pipVideo.removeEventListener("leavepictureinpicture", handlePipLeave);
    };
  }, [isLoaded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          handleFullscreen();
          break;
        case "KeyP":
          handlePictureInPicture();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipTime(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipTime(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9": {
          const percent = parseInt(e.code.slice(-1)) * 10;
          seekToPercent(percent);
          break;
        }
        case "Digit0":
          seekToPercent(0);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleRightClick = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleRightClick);
    return () => document.removeEventListener("contextmenu", handleRightClick);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    setDuration(videoRef.current.duration || 0);
    const { videoWidth, videoHeight } = videoRef.current;
    setVideoRatio(videoHeight > videoWidth ? "portrait" : "landscape");
    setIsLoaded(true);
    setIsBuffering(false);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;

    const time = v.currentTime || 0;
    setCurrentTime(time);

    const bufferedEnd = v.buffered.length > 0 ? v.buffered.end(v.buffered.length - 1) : 0;
    setBuffered(bufferedEnd);

    if (!hasTrackedView && time >= 5) {
      setHasTrackedView(true);
      fetch("/api/analytics/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: id }),
      }).catch(() => { });
    }
  };

  const handleWaiting = () => setIsBuffering(true);
  const handleCanPlay = () => setIsBuffering(false);

  const handleVolumeChange = () => {
    const v = videoRef.current;
    if (!v) return;
    setVolume(v.volume);
    setIsMuted(v.muted);
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || videoError) return;

    if (shouldUseTurnstile && !isTurnstileVerified) {
      return;
    }

    try {
      if (v.paused || v.ended) {
        await v.play();
        setIsPlaying(true);
      } else {
        v.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("Play/Pause error:", err);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const adjustVolume = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const newVolume = Math.max(0, Math.min(1, volume + delta));
    v.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
      v.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      v.muted = false;
    }
  };

  const skipTime = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = Math.max(0, Math.min(duration, (v.currentTime || 0) + seconds));
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const seekToPercent = (percent: number) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = (percent / 100) * duration || 0;
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;

    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration || 0;
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackSpeed = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    const doc = document as Document & {
      fullscreenElement?: Element | null;
      exitFullscreen?: () => Promise<void>;
    };
    const el = container as HTMLDivElement & {
      requestFullscreen?: () => Promise<void>;
    };

    if (doc.fullscreenElement) {
      doc.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  const handlePictureInPicture = async () => {
    const v = videoRef.current;
    if (!v) return;

    const doc = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    const pipCapableVideo = v as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<void>;
    };

    try {
      if (doc.pictureInPictureElement) {
        await doc.exitPictureInPicture?.();
      } else {
        await pipCapableVideo.requestPictureInPicture?.();
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const d = document as Document & { fullscreenElement?: Element | null };
      setIsFullscreen(!!d.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(Math.max(0, time) / 60);
    const seconds = Math.floor(Math.max(0, time) % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatViewCount = (count?: number | null) => {
    if (typeof count !== "number") return "0";
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const formatRelativeTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const m = Math.floor(diffInSeconds / 60);
      return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
    }
    if (diffInSeconds < 86400) {
      const h = Math.floor(diffInSeconds / 3600);
      return `${h} ${h === 1 ? "hour" : "hours"} ago`;
    }
    if (diffInSeconds < 2592000) {
      const d = Math.floor(diffInSeconds / 86400);
      return `${d} ${d === 1 ? "day" : "days"} ago`;
    }
    if (diffInSeconds < 31536000) {
      const mo = Math.floor(diffInSeconds / 2592000);
      return `${mo} ${mo === 1 ? "month" : "months"} ago`;
    }
    const y = Math.floor(diffInSeconds / 31536000);
    return `${y} ${y === 1 ? "year" : "years"} ago`;
  };

  const getVideoContainerClasses = () => {
    const baseClasses = "relative bg-black overflow-hidden shadow-2xl group";

    if (!isMobile) {
      return `${baseClasses} rounded-xl aspect-video`;
    } else {
      if (videoRatio === "portrait") {
        return `${baseClasses} rounded-none w-full h-screen fixed top-0 left-0 right-0 bottom-0 z-[60]`;
      } else {
        return `${baseClasses} rounded-xl aspect-video`;
      }
    }
  };

  const getMainContentClasses = () => {
    if (isMobile && videoRatio === "portrait") {
      return "fixed inset-0 z-[60] bg-black flex items-center justify-center";
    }
    return "pt-16";
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {mounted && (
        <>
          <Script
            id="adstera-popunder"
            src="https://eldestceramiccash.com/6a/b3/43/6ab343c9e192ad80a90f50ed73c5801f.js"
            strategy="afterInteractive"
          />

          <Script
            id="hiltopads-popunder"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(poi){
                  var d = document,
                      s = d.createElement('script'),
                      l = d.scripts[d.scripts.length - 1];
                  s.settings = poi || {};
                  s.src = "//loosebelt.com/c.Di9j6lbu2R5flXSmWWQX9YNmjGclwnM/DrAXwAOUCT0/2VN/zcAUwVMWDWAK5g";
                  s.async = true;
                  s.referrerPolicy = 'no-referrer-when-downgrade';
                  l.parentNode.insertBefore(s, l);
                })({})
              `
            }}
          />

          <Script
            id="clickadu-popunder"
            async
            data-cfasync="false"
            data-clocid="2076892"
            src="//astronautlividlyreformer.com/on.js"
            strategy="afterInteractive"
          />
        </>
      )}

      {!(isMobile && videoRatio === "portrait") && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <a href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                vipey
              </a>
            </div>
            <nav className="flex items-center space-x-4 text-sm">
              <a href="/advertise" className="text-gray-700 hover:text-gray-900 transition-colors">
                Advertise
              </a>
              <span className="text-gray-300">|</span>
              <a href="/login" className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-full transition-colors">
                Sign In
              </a>
            </nav>
          </div>
        </header>
      )}

      <main className={getMainContentClasses()}>
        {isMobile && videoRatio === "portrait" ? (
          <div
            ref={containerRef}
            className={getVideoContainerClasses()}
            onMouseMove={showControlsTemporarily}
            onTouchStart={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {videoUrl ? (
              videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                  <AlertCircle className="w-16 h-16" />
                  <div className="text-xl font-medium">Video unavailable</div>
                  <div className="text-sm text-gray-300">This video cannot be loaded</div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setVideoError(true)}
                    onWaiting={handleWaiting}
                    onCanPlay={handleCanPlay}
                    onVolumeChange={handleVolumeChange}
                    controls={false}
                    playsInline
                    onContextMenu={(e) => e.preventDefault()}
                  />

                  {(isBuffering || !isLoaded) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    </div>
                  )}

                  <div className="absolute top-4 right-4 text-white text-sm font-medium bg-black bg-opacity-30 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                    vipey.co
                  </div>

                  {isLoaded && (
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                    >
                      <div className="absolute top-4 left-4 z-10">
                        <button
                          onClick={() => window.history.back()}
                          className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 transition-all pointer-events-auto"
                        >
                          <Minimize className="w-6 h-6 text-white" />
                        </button>
                      </div>

                      {(!isPlaying || showControls) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <button
                            onClick={togglePlay}
                            className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-4 transition-all transform hover:scale-110 pointer-events-auto"
                          >
                            {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                          </button>
                        </div>
                      )}

                      <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
                        <div className="mb-4">
                          <div
                            ref={progressRef}
                            className="relative h-1 bg-white bg-opacity-30 rounded-full cursor-pointer group"
                            onClick={handleProgressClick}
                          >
                            <div
                              className="absolute top-0 left-0 h-full bg-white bg-opacity-50 rounded-full"
                              style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                            />
                            <div
                              className="absolute top-0 left-0 h-full bg-white rounded-full transition-all"
                              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button onClick={togglePlay} className="text-white hover:text-gray-300 transition-colors">
                              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                            </button>
                            <button onClick={toggleMute} className="text-white hover:text-gray-300 transition-colors">
                              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <div className="text-white text-sm font-mono">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div
                  ref={containerRef}
                  className={getVideoContainerClasses()}
                  onMouseMove={showControlsTemporarily}
                  onTouchStart={showControlsTemporarily}
                  onMouseLeave={() => isPlaying && setShowControls(false)}
                >
                  {videoUrl ? (
                    videoError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                        <AlertCircle className="w-16 h-16" />
                        <div className="text-xl font-medium">Video unavailable</div>
                        <div className="text-sm text-gray-300">This video cannot be loaded</div>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          className="w-full h-full object-contain"
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onError={() => setVideoError(true)}
                          onWaiting={handleWaiting}
                          onCanPlay={handleCanPlay}
                          onVolumeChange={handleVolumeChange}
                          controls={false}
                          playsInline
                          onContextMenu={(e) => e.preventDefault()}
                        />

                        {(isBuffering || !isLoaded) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                          </div>
                        )}

                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white text-xs sm:text-sm font-medium bg-black bg-opacity-30 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full backdrop-blur-sm pointer-events-none">
                          vipey.co
                        </div>

                        {isLoaded && (
                          <div
                            className={`absolute inset-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                              }`}
                          >
                            {(!isPlaying || showControls) && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <button
                                  onClick={togglePlay}
                                  className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 sm:p-4 transition-all transform hover:scale-110 pointer-events-auto"
                                >
                                  {isPlaying ? <Pause className="w-5 h-5 sm:w-8 sm:h-8 text-white" /> : <Play className="w-5 h-5 sm:w-8 sm:h-8 text-white ml-0.5 sm:ml-1" />}
                                </button>
                              </div>
                            )}

                            <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />

                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
                              <div className="mb-4">
                                <div
                                  ref={progressRef}
                                  className="relative h-1 bg-white bg-opacity-30 rounded-full cursor-pointer group"
                                  onClick={handleProgressClick}
                                >
                                  <div
                                    className="absolute top-0 left-0 h-full bg-white bg-opacity-50 rounded-full"
                                    style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                                  />

                                  <div
                                    className="absolute top-0 left-0 h-full bg-gray-900 rounded-full transition-all"
                                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                                  />

                                  <div
                                    className="absolute top-1/2 w-3 h-3 bg-gray-900 rounded-full transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{
                                      left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                                      marginLeft: "-6px",
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  <button onClick={togglePlay} className="text-white hover:text-gray-300 transition-colors">
                                    {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
                                  </button>

                                  <button
                                    onClick={() => skipTime(-10)}
                                    className="text-white hover:text-gray-300 transition-colors"
                                    title="Rewind 10 seconds"
                                  >
                                    <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>

                                  <button
                                    onClick={() => skipTime(10)}
                                    className="text-white hover:text-gray-300 transition-colors"
                                    title="Forward 10 seconds"
                                  >
                                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>

                                  <div className="flex items-center space-x-1 sm:space-x-2 group">
                                    <button
                                      onClick={toggleMute}
                                      onMouseEnter={() => setShowVolumeSlider(true)}
                                      className="text-white hover:text-gray-300 transition-colors"
                                    >
                                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </button>

                                    <div
                                      className={`transition-all duration-200 overflow-hidden ${showVolumeSlider ? "w-12 sm:w-16 opacity-100" : "w-0 opacity-0"
                                        }`}
                                      onMouseLeave={() => setShowVolumeSlider(false)}
                                    >
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const newVolume = parseFloat(e.target.value);
                                          if (videoRef.current) {
                                            videoRef.current.volume = newVolume;
                                            videoRef.current.muted = newVolume === 0;
                                          }
                                          setVolume(newVolume);
                                          setIsMuted(newVolume === 0);
                                        }}
                                        className="w-full h-1 bg-white bg-opacity-30 rounded-full outline-none slider"
                                      />
                                    </div>
                                  </div>

                                  <div className="text-white text-xs sm:text-sm font-mono">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  {(() => {
                                    const doc = document as Document & { pictureInPictureEnabled?: boolean };
                                    return doc.pictureInPictureEnabled ? (
                                      <button
                                        onClick={handlePictureInPicture}
                                        className={`transition-colors ${isPictureInPicture ? "text-blue-400 hover:text-blue-300" : "text-white hover:text-gray-300"
                                          }`}
                                        title={isPictureInPicture ? "Exit Picture-in-Picture (P)" : "Picture-in-Picture (P)"}
                                      >
                                        <PictureInPicture2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                      </button>
                                    ) : null;
                                  })()}

                                  <div className="relative">
                                    <button
                                      onClick={() => setShowSettingsMenu((s) => !s)}
                                      className="text-white hover:text-gray-300 transition-colors flex items-center space-x-1"
                                      title="Playback speed"
                                    >
                                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                                      <span className="text-xs">{playbackSpeed}x</span>
                                    </button>

                                    {showSettingsMenu && (
                                      <div className="settings-menu absolute bottom-8 right-0 bg-black bg-opacity-90 rounded-lg p-3 min-w-[120px] sm:min-w-[140px]">
                                        <div className="text-white text-sm font-medium mb-2">Playback Speed</div>
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                                            <button
                                              key={speed}
                                              onClick={() => changePlaybackSpeed(speed)}
                                              className={`block w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded text-sm transition-colors ${playbackSpeed === speed
                                                ? "bg-white bg-opacity-20 text-white font-medium"
                                                : "text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10"
                                                }`}
                                            >
                                              {speed === 1 ? "Normal" : `${speed}x`}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={handleFullscreen}
                                    className="text-white hover:text-gray-300 transition-colors"
                                    title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
                                  >
                                    {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {videoTitle || `Video ${id}`}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-900 mb-4">
                        {viewCount !== null && (
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{formatViewCount(viewCount)} views</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-6">
                          <button
                            onClick={() => handleReaction(true)}
                            disabled={isReactionLoading}
                            className={`flex items-center space-x-2 transition-colors hover:text-gray-700 ${userReaction === 'like'
                              ? 'text-blue-600 hover:text-blue-700'
                              : 'text-gray-900'
                              } ${isReactionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Like this video"
                          >
                            <ThumbsUp className={`w-5 h-5 ${userReaction === 'like' ? 'fill-current' : ''}`} />
                            <span className="font-medium">{formatViewCount(totalLikes)}</span>
                          </button>

                          <button
                            onClick={() => handleReaction(false)}
                            disabled={isReactionLoading}
                            className={`flex items-center space-x-2 transition-colors hover:text-gray-700 ${userReaction === 'dislike'
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-gray-900'
                              } ${isReactionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Dislike this video"
                          >
                            <ThumbsDown className={`w-5 h-5 ${userReaction === 'dislike' ? 'fill-current' : ''}`} />
                            <span className="font-medium">{formatViewCount(totalDislikes)}</span>
                          </button>

                          <button onClick={copyUrl} className="flex items-center space-x-1 hover:text-gray-900 transition-colors">
                            {copied ? <Check className="w-4 h-4" /> : <Share className="w-4 h-4" />}
                            <span>{copied ? "Copied!" : "Share"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        readOnly
                        value={currentUrl}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={copyUrl}
                        className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <section className="mt-6 px-2" aria-label="Promosi Publisher">
                  <div
                    className="relative rounded-lg overflow-hidden shadow-md"
                    style={{
                      backgroundImage: `url('https://thumbor.prod.vidiocdn.com/PMSQX9HVvi7BDPbR8ZCz-BlSd0w=/960x576/filters:quality(75)/vidio-web-prod-film/uploads/film/mobile_headline_image/4153/one-punch-man-eb4d73.jpg')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                      <h2 className="text-base sm:text-lg font-semibold text-white leading-snug">
                        Nonton Anime Gratis <br />
                        <span className="text-green-400 font-bold">Tanpa drama dan tanpa ribet</span>
                      </h2>
                      <p className="text-xs text-gray-300 mt-2 mb-3 max-w-xs">
                        Bisa nonton anime tanpa batas dan buffering lancar.
                      </p>
                      <a
                        href="https://anipey.co"
                        className="inline-block bg-yellow-500 hover:bg-yellow-600 text-xs font-bold text-black px-4 py-1.5 rounded-full shadow-md transition transform hover:scale-105"
                      >
                        Nonton Anime disini
                      </a>
                    </div>
                    <img
                      src="https://thumbor.prod.vidiocdn.com/PMSQX9HVvi7BDPbR8ZCz-BlSd0w=/960x576/filters:quality(75)/vidio-web-prod-film/uploads/film/mobile_headline_image/4153/one-punch-man-eb4d73.jpg"
                      alt="Nonton Anime One Punch Man Sub Indo"
                      className="w-full aspect-video invisible"
                    />
                  </div>
                </section>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Related Videos</h3>
                  {loadingRelated ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex space-x-3 animate-pulse">
                          <div className="w-24 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : relatedVideos.length > 0 ? (
                    <div className="related-videos-container max-h-96 overflow-y-auto pr-2">
                      <div className="space-y-3">
                        {relatedVideos.map((video) => (
                          <a
                            key={video.videoId}
                            href={`/v?id=${video.videoId}`}
                            className="flex space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors group"
                          >
                            <div className="relative w-24 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                              {video.thumbnail ? (
                                <img
                                  src={video.thumbnail}
                                  alt={video.title || `Video ${video.videoId}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback = target.nextElementSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs"
                                style={{ display: video.thumbnail ? "none" : "flex" }}
                              >
                                No Image
                              </div>
                              {typeof video.duration === "number" && (
                                <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                                  {formatTime(video.duration)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-gray-700">
                                {video.title || `Video ${video.videoId}`}
                              </h4>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{formatViewCount(video.totalViews)} views</span>
                                {video.createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>{formatRelativeTime(video.createdAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      <p>No related videos found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {mounted && (
          <>
          </>
        )}

        {!(isMobile && videoRatio === "portrait") && (
          <footer className="bg-white border-t mt-12">
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="text-center">
                <p className="text-gray-900 text-sm">&copy; {new Date().getFullYear()} vipey.co - All rights reserved</p>
                <div className="flex justify-center space-x-6 mt-4 text-sm">
                  <a href="/terms" className="text-gray-900 hover:text-gray-900">
                    Terms of Service
                  </a>
                  <a href="/privacy" className="text-gray-900 hover:text-gray-900">
                    Privacy Policy
                  </a>
                  <a href="/report" className="text-gray-900 hover:text-gray-900">
                    Report Abuse
                  </a>
                </div>
              </div>
            </div>
          </footer>
        )}

        {isPictureInPicture && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg z-50">
            <div className="flex items-center space-x-2">
              <PictureInPicture2 className="w-4 h-4" />
              <span>Picture-in-Picture active</span>
            </div>
          </div>
        )}

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          }}
        >
          <a href="/" target="_blank" rel="noopener noreferrer">
            <img
              src="https://sstatic1.histats.com/0.gif?4957596&101"
              alt=""
              width={1}
              height={1}
              style={{ border: 0 }}
            />
          </a>
        </div>
      </main>

      {shouldUseTurnstile && !isTurnstileVerified && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-[9999]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={async (token) => {
              setTurnstileToken(token);
              setIsTurnstileVerified(true);

              try {
                const response = await fetch("/api/turnstile/verify", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!data.success) {
                  console.error("Turnstile verification failed:", data.error);
                }
              } catch (error) {
                console.error("Verification error:", error);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}