"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown } from "lucide-react";

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

export default function ApprovedRejectedPayoutHistory() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState<PayoutDetail[] | null>(
    null
  );

  const fetchHistory = () => {
    setLoading(true);
    fetch("/api/payment/nasilemak/history")
      .then((res) => res.json())
      .then((data) => setPayouts(data.historyPayouts))
      .catch((err) => console.error("Failed to load payout history:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePrintPDF = (payout: Payout) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Laporan Pembayaran", pageWidth / 2, 20, { align: "center" });

    doc.setDrawColor(200);
    doc.line(14, 26, pageWidth - 14, 26);

    doc.setFontSize(12);
    let y = 34;
    const lineHeight = 8;

    const infoLines = [
      `Nama Lengkap  : ${payout.user.fullName}`,
      `Username      : @${payout.user.username}`,
      `Email         : ${payout.user.email}`,
      `WhatsApp      : ${payout.user.whatsapp}`,
      `Jumlah Dibayar: $${payout.amount.toLocaleString()}`,
      `Tanggal Bayar : ${format(
        new Date(payout.paidAt),
        "dd MMM yyyy, HH:mm"
      )}`,
      `Status        : ${
        payout.status === "approved" ? "Disetujui" : "Ditolak"
      }`,
    ];

    infoLines.forEach((line) => {
      doc.text(line, 14, y);
      y += lineHeight;
    });

    autoTable(doc, {
      startY: y + 4,
      head: [["Video ID", "Jumlah (USD)"]],
      body: payout.details.map((detail) => [
        `#${detail.videoId}`,
        `$${detail.amount.toFixed(2)}`,
      ]),
      styles: {
        halign: "left",
        fontSize: 11,
      },
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`Payout-${payout.user.username}-${payout.id}.pdf`);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Riwayat Pembayaran" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-500 dark:text-gray-400">
              Memuat data...
            </p>
          ) : payouts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">
              Tidak ada riwayat pembayaran.
            </p>
          ) : (
            <table className="min-w-full text-sm border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Email / WA</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Videos</th>
                  <th className="px-4 py-2">Tanggal</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Cetak</th>
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
                      <span className="text-xs text-gray-500">
                        @{payout.user.username}
                      </span>
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
                    <td className="px-4 py-3 font-semibold">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                          payout.status === "approved"
                            ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300"
                        }`}
                      >
                        {payout.status === "approved" ? "Disetujui" : "Ditolak"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === "approved" && (
                        <button
                          onClick={() => handlePrintPDF(payout)}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <FileDown className="w-4 h-4" />
                          PDF
                        </button>
                      )}
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
    </div>
  );
}