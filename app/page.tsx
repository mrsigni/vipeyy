"use client";

import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showFileTypeModal, setShowFileTypeModal] = useState(false);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mime = file.type;
    const size = file.size;

    if (!["video/mp4", "video/quicktime"].includes(mime)) {
      if (
        ["video/webm", "video/x-msvideo", "video/x-matroska"].includes(mime)
      ) {
        setShowFileTypeModal(true);
      } else {
        setShowUnsupportedModal(true);
      }
      event.target.value = "";
      return;
    }

    if (size > 100 * 1024 * 1024) {
      setErrorMessage("Error: too large, please upload a file less than 100MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    const visitorId = uuidv4();

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://videy.co/api/upload?visitorId=${encodeURIComponent(visitorId)}`,
      true
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setUploadProgress(null);
        setIsProcessing(true);
        const result = JSON.parse(xhr.responseText);
        const replacedLink = result.link.replace(
          "https://videy.co",
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        );
        window.location.href = replacedLink;
      } else {
        setUploadProgress(null);
        setErrorMessage("Upload failed, please try again.");
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setErrorMessage("An error occurred during upload.");
    };

    xhr.send(formData);
  };

  const uploadButtonText = () => {
    if (uploadProgress !== null) {
      return uploadProgress === 100 ? "Processing" : `${uploadProgress}%`;
    } else if (isProcessing) {
      return "Processing";
    } else {
      return "Upload a Video";
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-50 bg-white shadow border-b"
        role="banner"
      >
       
        <div className="max-w-screen-md px-4 mx-auto p-2 flex justify-between items-center">
          <a
            href="/"
            className="text-2xl sm:text-3xl font-bold"
            aria-label="Homepage"
          >
            vipey
          </a>
          <nav role="navigation" aria-label="Primary Navigation">
            <ul className="flex items-center text-sm text-gray-800 gap-2 sm:gap-3">
              <li>
                <a
                  href="/advertise"
                  className="hover:text-black transition-colors"
                >
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
      <main className="flex flex-col min-h-screen bg-white pt-[72px]">
        <section
          className="flex-grow flex justify-center"
          aria-labelledby="upload-section-heading"
        >
          <div className="w-full max-w-screen-md px-4 sm:px-8 flex flex-col mt-[2vh] sm:mt-[6vh] text-center">
            <h1
              id="upload-section-heading"
              className="text-[28px] sm:text-[32px] font-semibold leading-tight"
            >
              Upload dan Monetisasi Video Kamu di Vipey.co
            </h1>
            <p className="text-base text-gray-600 mt-4">
              Mulai upload video sekarang
            </p>
            <div className="flex justify-center mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null || isProcessing}
                className="bg-black text-white text-sm font-medium rounded-full w-[230px] py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploadButtonText()}
              </button>
            </div>
            {errorMessage && (
              <div className="text-red-500 text-sm mt-4">{errorMessage}</div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </section>

        <section className="mt-6 px-4" aria-label="Gambar Publisher">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="w-full">
              <img
                src="banner-pub.webp"
                alt="Gabung jadi publisher dan hasilkan uang"
                className="w-full aspect-video object-cover rounded shadow"
              />
            </div>
            <div className="relative rounded-md overflow-hidden shadow-md bg-gray-100 w-full">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4 py-5 sm:py-6">
                <h2 className="text-sm sm:text-base font-bold text-white leading-snug">
                  Upload Videomu dan Hasilkan <br />
                  <span className="text-green-400 text-base sm:text-lg">
                    Jutaan Rupiah per Minggu
                  </span>
                </h2>
                <h3 className="text-[11px] sm:text-sm text-gray-200 mt-2 mb-3 max-w-[240px]">
                  Jadi publisher vipey sekarang. Gratis, mudah, dan langsung
                  bisa mulai cuan.
                </h3>
                <a
                  href="/register?ref=publisher"
                  className="inline-block bg-yellow-500 hover:bg-yellow-600 text-[11px] sm:text-sm font-semibold text-black px-3 py-1.5 rounded-full shadow transition hover:scale-[1.03]"
                >
                  Daftar Jadi Publisher
                </a>
              </div>
              <img
                src="https://assets.pikiran-rakyat.com/crop/0x0:0x0/1200x675/photo/2024/01/12/1793837542.jpg"
                alt="Gabung jadi publisher dan hasilkan uang"
                className="w-full aspect-video object-cover"
              />
            </div>
            <div className="w-full sm:col-span-2">
              <img
                src="banner-publisher.jpg"
                alt="Gabung jadi publisher dan hasilkan uang"
                className="w-full aspect-video object-cover rounded shadow"
              />
            </div>
          </div>
        </section>
      </main>
      <footer
        className="text-center text-xs text-gray-500 mb-6 px-4 mt-6"
        role="contentinfo"
      >
        <p className="font-semibold">
          &copy; {new Date().getFullYear()} vipey.co
        </p>
        <nav className="mt-2" aria-label="Footer navigation">
          <ul className="flex justify-center gap-6">
            <li>
              <a href="/terms-of-service" className="underline">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="/report" className="underline">
                Report Abuse
              </a>
            </li>
          </ul>
        </nav>
      </footer>
      {showFileTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md text-center max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Unsupported File Type</h2>
            <p>
              Please upload your file to{" "}
              <a
                href="https://aceimg.com"
                className="underline"
                target="_blank"
              >
                AceImg.com
              </a>{" "}
              instead.
            </p>
            <button
              onClick={() => window.open("https://aceimg.com", "_blank")}
              className="mt-6 w-full py-2 bg-black text-white rounded-md font-semibold"
            >
              Go to AceImg
            </button>
          </div>
        </div>
      )}
      {showUnsupportedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md text-center max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Unsupported File Type</h2>
            <p>Only MP4 and MOV video files are supported</p>
            <button
              onClick={() => setShowUnsupportedModal(false)}
              className="mt-6 w-full py-2 bg-black text-white rounded-md font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}