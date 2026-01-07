"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Login gagal");
      } else {
        toast.success("Login berhasil");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat login");
    } finally {
      setLoading(false);
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

      <main className="flex flex-col min-h-screen bg-white">
        <div className="flex-grow flex items-center justify-center pt-[72px] px-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white border w-full max-w-sm p-6 rounded-lg text-center"
          >
            <h1 className="text-2xl font-semibold mb-2">Login ke Vipey</h1>
            <p className="text-sm text-gray-600 mb-6">
              Akses akun publisher kamu untuk mulai cuan.
            </p>

            <div className="mb-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={`w-full px-4 py-2 border rounded ${
                  errors.email ? "border-red-500" : ""
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div className="mb-4 text-left">
              <div className="relative h-10">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`w-full h-full px-4 pr-10 text-sm border rounded ${
                    errors.password ? "border-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-medium w-full py-2 rounded-full hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Login"}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Belum punya akun?{" "}
              <a href="/register" className="underline">
                Daftar di sini
              </a>
            </p>
          </form>
        </div>
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
      </main>
    </>
  );
}