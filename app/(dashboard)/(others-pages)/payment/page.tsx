"use client";

import PageBreadcrumb from "../Breads";
import { useEffect, useState } from "react";

export default function RequestPaymentPage() {
  const [availableToWithdraw, setAvailableToWithdraw] = useState<number>(0);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"success" | "error" | null>(
    null
  );
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState<number>(0);

  const [method, setMethod] = useState<{
    type: string;
    name: string;
    number: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitialLoading(true);
        const [resBalance, resMethod] = await Promise.all([
          fetch("/api/payment/balance"),
          fetch("/api/payment-methods"),
        ]);
        const balanceData = await resBalance.json();
        setTotalEarnings(balanceData.totalEarnings || 0);
        setTotalWithdrawn(balanceData.totalWithdrawn || 0);
        setAvailableToWithdraw(balanceData.availableToWithdraw || 0);

        const methodData = await resMethod.json();
        setAvailableToWithdraw(balanceData.availableToWithdraw || 0);
        setMethod(methodData ?? null);
      } catch (err) {
        setResponseMessage("Gagal memuat data");
        setResponseType("error");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMessage(null);
    setResponseType(null);

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setResponseMessage("Masukkan jumlah yang valid");
      setResponseType("error");
      return;
    }
    if (value < 50) {
      setResponseMessage("Minimal penarikan adalah $50");
      setResponseType("error");
      return;
    }
    if (value > availableToWithdraw) {
      setResponseMessage("Jumlah melebihi saldo tersedia");
      setResponseType("error");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Tampilkan pesan error dari server jika ada
        const errorMessage = data.error || "Terjadi kesalahan saat mengirim permintaan";
        setResponseMessage(errorMessage);
        setResponseType("error");
        return;
      }

      setAmount("");
      setAvailableToWithdraw(data.newBalance ?? availableToWithdraw - value);
      setTotalWithdrawn(prev => prev + value);
      setResponseMessage("Permintaan pembayaran berhasil dikirim");
      setResponseType("success");
    } catch (err) {
      setResponseMessage("Terjadi kesalahan jaringan. Silakan coba lagi.");
      setResponseType("error");
    } finally {
      setLoading(false);
    }
  };

  const getIconSrc = (type: string) => {
    switch (type.toLowerCase()) {
      case "dana":
        return "/icons/dana.svg";
      case "ovo":
        return "/icons/ovo.svg";
      case "gopay":
        return "/icons/gopay.svg";
      case "shopeepay":
        return "/icons/shopeepay.svg";
      case "paypal":
        return "/icons/paypal.svg";
      case "bca":
        return "/icons/bca.svg";
      case "bni":
        return "/icons/bni.svg";
      case "bri":
        return "/icons/bri.svg";
      case "mandiri":
        return "/icons/mandiri.svg";
      case "btc":
        return "/icons/btc.svg";
      case "eth":
        return "/icons/eth.svg";
      case "usdt":
        return "/icons/usdt.svg";
      case "usdc":
        return "/icons/usdc.svg";
      default:
        return "/icons/default.svg";
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Request Payment" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {initialLoading ? (
          <div className="text-center text-gray-500">Memuat data...</div>
        ) : (
          <div className="mx-auto w-full max-w-[540px]">
            <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl text-center">
              Ajukan Permintaan Pembayaran
            </h3>

            <div className="mb-5 text-center text-sm text-gray-600 dark:text-gray-300">
              <div className="mb-5 text-center text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium">
                  Total Pendapatan:&nbsp;
                  <span className="text-green-600 font-semibold">
                    ${totalEarnings}
                  </span>
                  &nbsp;-&nbsp;
                  <span className="text-red-600 font-semibold">
                    ${totalWithdrawn}
                  </span>
                  &nbsp;=&nbsp;
                  <span className="text-blue-600 font-semibold">
                    ${availableToWithdraw}
                  </span>
                </p>
              </div>
            </div>

            <div className="mb-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 text-center dark:bg-white/[0.03] dark:text-gray-300 dark:border-white/[0.06]">
              Minimal penarikan adalah{" "}
              <strong className="text-blue-600 dark:text-white">$50</strong>.
              Harap pastikan jumlah sesuai sebelum mengirim permintaan.
            </div>

            {!method ? (
              <div className="mb-2 rounded border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 text-center">
                Kamu belum menambahkan metode pembayaran. Silakan atur di
                halaman profil sebelum melakukan penarikan.
              </div>
            ) : (
              <div className="mb-5 border border-gray-200 bg-white px-4 py-3 rounded-xl dark:bg-white/[0.03] dark:border-white/[0.06]">
                <p className="font-semibold mb-2 text-gray-800 dark:text-white">
                  Metode Pembayaran Kamu:
                </p>
                <div className="flex items-center gap-3 mb-1">
                  <img
                    src={getIconSrc(method.type)}
                    alt={method.type}
                    className="w-5 h-5 object-contain"
                  />
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {method.type}: {method.name}
                  </span>
                </div>
                <p className="ml-8 text-sm text-gray-500 dark:text-gray-400">
                  {method.number}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                  Jumlah Penarikan ($)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Masukkan jumlah yang ingin ditarik"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(String(availableToWithdraw))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Tarik semua
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? "Memproses..." : "Kirim Permintaan"}
              </button>

              {responseMessage && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm mt-2 text-center ${
                    responseType === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {responseMessage}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}