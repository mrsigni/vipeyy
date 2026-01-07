'use client';

import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const [cpm, setCpm] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialCpm, setInitialCpm] = useState("");

  useEffect(() => {
    const fetchCpm = async () => {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok) {
        setInitialCpm(data.cpm.toString());
        setCpm(data.cpm.toString());
      } else {
        toast.error("Gagal memuat CPM");
      }
    };
    fetchCpm();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = parseFloat(cpm);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Masukkan nilai CPM yang valid");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpm: parsed }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success("CPM berhasil diperbarui");
      setInitialCpm(parsed.toString());
    } else {
      toast.error(data.message || "Gagal memperbarui CPM");
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Pengaturan CPM" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px]">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Pengaturan CPM
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base mb-6">
            Ubah nilai CPM (Cost Per Mille) yang digunakan untuk perhitungan penghasilan pengguna.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Nilai CPM (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={cpm}
                onChange={(e) => setCpm(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-6 py-2 rounded-full hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}