"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { toast } from "react-hot-toast";

export default function OtpPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!token) {
      setError("Kode OTP wajib diisi");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Verifikasi gagal");
        setLoading(false);
        return;
      }

      toast.success("Verifikasi berhasil!");
      setLoading(false);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      toast.error("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="fixed top-0 left-0 w-full z-50 bg-white shadow border-b">
        <div className="max-w-screen-md px-4 mx-auto p-2 flex justify-between items-center">
          <a href="/" className="text-2xl sm:text-3xl font-bold">vipey</a>
          <nav>
            <ul className="flex items-center text-sm text-gray-800 gap-2 sm:gap-3">
              <li><a href="/advertise" className="hover:text-black">Advertise</a></li>
              <li><span className="text-gray-400">|</span></li>
              <li><a href="/login" className="hover:text-black">Login</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-[100px] px-4">
        <section className="flex items-center justify-center">
          <form
            onSubmit={handleVerify}
            className="bg-white border w-full max-w-sm p-6 rounded-lg text-center"
          >
            <h1 className="text-2xl font-semibold mb-2">Verifikasi Email</h1>
            <p className="text-sm text-gray-600 mb-6">
              Masukkan kode OTP yang dikirim ke <strong>{email}</strong>
            </p>

            <div className="mb-4 text-left">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Kode OTP"
                className={`w-full px-4 py-2 border rounded ${
                  error ? "border-red-500" : ""
                }`}
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-medium w-full py-2 rounded-full hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Verifikasi"}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Tidak menerima kode? <a href="/resend-otp" className="underline">Kirim ulang</a>
            </p>
          </form>
        </section>
      </main>

      <footer className="text-center text-xs text-gray-500 mb-6 px-4 mt-6">
        <p className="font-semibold">&copy; {new Date().getFullYear()} vipey.co</p>
        <nav className="mt-2">
          <ul className="flex justify-center gap-6">
            <li><a href="/terms-of-service" className="underline">Terms of Service</a></li>
            <li><a href="/report" className="underline">Report Abuse</a></li>
          </ul>
        </nav>
      </footer>
    </div>
  );
}
