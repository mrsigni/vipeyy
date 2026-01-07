"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader } from "lucide-react";

type PayoutDetail = {
  videoId: number;
  amount: number;
};

type Payout = {
  id: number;
  userId: string;
  amount: number;
  status: string;
  paidAt: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    whatsapp: string;
  };
  details: PayoutDetail[];
};

export default function PendingPayoutPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<PayoutDetail[] | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    id: number;
    action: "approved" | "rejected";
  } | null>(null);

  const fetchPayouts = () => {
    setLoading(true);
    fetch("/api/payment/nasilemak/request")
      .then((res) => res.json())
      .then((data) => setPayouts(data.pendingPayouts))
      .catch((err) => console.error("Failed to load payouts:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleAction = async (id: number, action: "approved" | "rejected") => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/payment/nasilemak/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: action }),
      });

      if (res.ok) {
        fetchPayouts();
      } else {
        const err = await res.json();
        alert("Gagal memperbarui status: " + err?.error);
      }
    } catch (error) {
      console.error("Error updating payout:", error);
    } finally {
      setProcessingId(null);
      setConfirmModal(null);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Request Pembayaran Pending" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Memuat data...</p>
          ) : payouts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Tidak ada request pending.</p>
          ) : (
            <table className="min-w-full text-sm border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Email / WA</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Videos</th>
                  <th className="px-4 py-2">Requested At</th>
                  <th className="px-4 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="bg-gray-50 dark:bg-white/[0.05] rounded-xl shadow-sm"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      {payout.user.fullName} <br />
                      <span className="text-xs text-gray-500">@{payout.user.username}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {payout.user.email}
                      <br />
                      <span className="text-xs">{payout.user.whatsapp}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                      ${payout.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedDetails(payout.details)}
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Video
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {format(new Date(payout.paidAt), "dd MMM yyyy, HH:mm")}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => setConfirmModal({ id: payout.id, action: "approved" })}
                        disabled={processingId === payout.id}
                        className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Terima
                      </button>
                      <button
                        onClick={() => setConfirmModal({ id: payout.id, action: "rejected" })}
                        disabled={processingId === payout.id}
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Detail Video
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedDetails.map((d, index) => (
                <div key={index} className="text-gray-700 dark:text-gray-300">
                  Video #{d.videoId}: ${d.amount.toFixed(2)}
                </div>
              ))}
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedDetails(null)}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Konfirmasi Aksi
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Yakin ingin{" "}
              <strong className={confirmModal.action === "approved" ? "text-green-600" : "text-red-600"}>
                {confirmModal.action === "approved" ? "menerima" : "menolak"}
              </strong>{" "}
              request payout ini?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                Batal
              </button>
<button
  onClick={() => handleAction(confirmModal.id, confirmModal.action)}
  disabled={processingId === confirmModal.id}
  className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-white ${
    confirmModal.action === "approved"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700"
  } disabled:opacity-50`}
>
  {processingId === confirmModal.id ? (
    <>
      <Loader className="h-4 w-4 animate-spin" />
      Memproses...
    </>
  ) : (
    "Ya, Lanjutkan"
  )}
</button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
