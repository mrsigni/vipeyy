"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader } from "lucide-react";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Nama wajib diisi")
      .max(50, "Nama maksimal 50 karakter")
      .regex(/^[a-zA-Z\s]+$/, "Nama hanya boleh huruf dan spasi"),
    whatsapp: z
      .string()
      .min(1, "Nomor WhatsApp wajib diisi")
      .regex(/^\+\d{8,15}$/, "Nomor WhatsApp tidak valid"),
    email: z.string().email("Email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-z]/, "Password harus mengandung huruf kecil")
      .regex(/[A-Z]/, "Password harus mengandung huruf besar")
      .regex(/\d/, "Password harus mengandung angka")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/,
        "Password harus mengandung karakter khusus"
      ),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+62");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = registerSchema.safeParse({
      fullName,
      whatsapp: countryCode + normalizePhone(whatsapp),
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          whatsapp: countryCode + normalizePhone(whatsapp),
          email,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          const zodErrors = data.errors;
          const fieldErrors: Record<string, string> = {};
          Object.keys(zodErrors).forEach((key) => {
            fieldErrors[key] = zodErrors[key]._errors?.[0] ?? "Error";
          });
          setErrors(fieldErrors);
        } else {
          toast.error(data.message || "Registrasi gagal");
        }
        setLoading(false);
        return;
      }
      toast.success("Registrasi berhasil. Silakan verifikasi OTP.");
      setTimeout(() => router.push(`/register/otp?email=${encodeURIComponent(email)}`), 2000);
    } catch (err) {
      toast.error("Terjadi kesalahan");
    }

    setFullName("");
    setWhatsapp("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  };

  const countryCodes = [
    { code: "+62", icon: "🇮🇩" },
    { code: "+60", icon: "🇲🇾" },
    { code: "+65", icon: "🇸🇬" },
    { code: "+66", icon: "🇹🇭" },
    { code: "+63", icon: "🇵🇭" },
    { code: "+84", icon: "🇻🇳" },
    { code: "+86", icon: "🇨🇳" },
    { code: "+82", icon: "🇰🇷" },
    { code: "+81", icon: "🇯🇵" },
    { code: "+91", icon: "🇮🇳" },
    { code: "+92", icon: "🇵🇰" },
    { code: "+880", icon: "🇧🇩" },
    { code: "+971", icon: "🇦🇪" },
    { code: "+966", icon: "🇸🇦" },
    { code: "+44", icon: "🇬🇧" },
    { code: "+33", icon: "🇫🇷" },
    { code: "+49", icon: "🇩🇪" },
    { code: "+39", icon: "🇮🇹" },
    { code: "+34", icon: "🇪🇸" },
    { code: "+7", icon: "🇷🇺" },
    { code: "+1", icon: "🇺🇸" },
    { code: "+55", icon: "🇧🇷" },
    { code: "+61", icon: "🇦🇺" },
    { code: "+64", icon: "🇳🇿" },
  ];

  const normalizePhone = (phone: string) => phone.trim().replace(/^0+/, "");

  return (
    <div className="flex flex-col min-h-screen bg-white">
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
      <main className="flex-grow pt-[100px] px-4">
        <section
          className="flex items-center justify-center"
          aria-labelledby="register-heading"
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white border w-full max-w-sm p-6 rounded-lg text-center"
          >
            <h1 id="register-heading" className="text-2xl font-semibold mb-2">
              Daftar ke Vipey
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Buat akun publisher untuk mulai cuan.
            </p>

            <div className="mb-3 text-left">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full px-4 py-2 border rounded"
              />
              {errors.fullName && (
                <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>
              )}
            </div>
            <div className="mb-3 text-left">
              <div className="flex w-full h-10 rounded border overflow-hidden">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[100px] border-none px-2 text-sm focus:ring-0 focus:ring-offset-0 shadow-none rounded-none bg-white">
                    <SelectValue placeholder="+62" />
                  </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 shadow-lg">
                    {countryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.icon} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Nomor WhatsApp"
                  className="flex-1 px-3 text-sm outline-none"
                />
              </div>
              {errors.whatsapp && (
                <p className="text-sm text-red-600 mt-1">{errors.whatsapp}</p>
              )}
            </div>
            <div className="mb-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2 border rounded"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
            <div className="mb-3 text-left">
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
            <div className="mb-4 text-left">
              <div className="relative h-10">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Konfirmasi Password"
                  className={`w-full h-full px-4 pr-10 text-sm border rounded ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-medium w-full py-2 rounded-full hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Daftar"}
            </button>
            <p className="text-xs text-gray-500 mt-3">
              Dengan mendaftar, Anda menyetujui{" "}
              <a href="/terms-of-service" className="underline">
                Syarat dan Ketentuan
              </a>{" "}
              serta{" "}
              <a href="/privacy-policy" className="underline">
                Kebijakan Privasi
              </a>
              .
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Sudah punya akun?{" "}
              <a href="/login" className="underline">
                Login di sini
              </a>
            </p>
          </form>
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
    </div>
  );
}