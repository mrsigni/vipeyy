"use client";

import PageBreadcrumb from "../../Breads";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface PaymentMethod {
  id: number;
  type: string;
  name: string;
  number: string;
}

export default function PaymentMethodPage() {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMethod = async () => {
    try {
      const res = await fetch("/api/payment-methods");
      if (!res.ok) throw new Error("Gagal fetch metode");
      const data = await res.json();
      setMethod(data ?? null);
    } catch (err) {
      console.error("Fetch method gagal:", err);
      setMethod(null);
    }
  };

  const handleAdd = async () => {
    if (!type || !name || !number) {
      toast.error("Lengkapi semua kolom");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, number }),
      });

      if (!res.ok) throw new Error("Gagal menambahkan");
      toast.success("Metode pembayaran ditambahkan");
      setType("");
      setName("");
      setNumber("");
      fetchMethod();
    } catch {
      toast.error("Gagal menambahkan metode");
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

  useEffect(() => {
    fetchMethod();
  }, []);

  return (
    <div>
      <PageBreadcrumb pageTitle="Metode Pembayaran" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Tambah Metode Pembayaran
          </h3>

          <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Pastikan data pembayaran yang kamu masukkan sudah benar. Kami tidak
            bertanggung jawab atas kesalahan pengisian seperti nama, nomor
            rekening, atau e-wallet.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={type} onValueChange={setType} disabled={!!method}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Tipe Pembayaran" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 shadow-lg">
                <SelectGroup>
                  <SelectLabel>E-Wallet</SelectLabel>
                  <SelectItem value="DANA">DANA</SelectItem>
                  <SelectItem value="OVO">OVO</SelectItem>
                  <SelectItem value="Gopay">GoPay</SelectItem>
                  <SelectItem value="ShopeePay">ShopeePay</SelectItem>
                  <SelectItem value="PayPal">PayPal</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Bank Indonesia</SelectLabel>
                  <SelectItem value="BCA">BCA</SelectItem>
                  <SelectItem value="BNI">BNI</SelectItem>
                  <SelectItem value="BRI">BRI</SelectItem>
                  <SelectItem value="Mandiri">Mandiri</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Crypto</SelectLabel>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama (Pemilik / Bank)"
              className="px-4 py-2 rounded border border-gray-300 text-sm"
              disabled={!!method}
            />
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Nomor Rekening / HP"
              className="px-4 py-2 rounded border border-gray-300 text-sm col-span-full"
              disabled={!!method}
            />
            <button
              onClick={handleAdd}
              disabled={loading || !!method}
              className="bg-blue-600 text-white py-2 rounded col-span-full hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>

          <div className="pt-4">
            <h4 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-200">
              Metode Pembayaran Saya
            </h4>

            {!method ? (
              <p className="text-sm text-gray-500">Belum ada metode.</p>
            ) : (
              <div className="border border-gray-200 dark:border-white/[0.05] p-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={getIconSrc(method.type)}
                    alt={method.type}
                    className="w-6 h-6 object-contain"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                      {method.type}: {method.name}
                    </p>
                    <p className="text-sm text-gray-500">{method.number}</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}