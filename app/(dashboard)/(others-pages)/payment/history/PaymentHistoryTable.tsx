"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import { FileDown } from "lucide-react";

type Payout = {
  id: number;
  amount: number;
  status: string;
  paidAt: Date;
  user: {
    fullName: string;
    username: string;
    email: string;
    whatsapp: string;
  };
  details: {
    videoId: number;
    amount: number;
  }[];
};

const COMPANY_NAME = "Vipey Platform";
const COMPANY_ADDRESS = "10 Downing Street, London SW1A 2AA, United Kingdom";
const COMPANY_EMAIL = "support@vipey.co";

export default function PaymentHistoryTable({ payouts }: { payouts: Payout[] }) {
  const handleSinglePayoutPDF = (payout: Payout) => {
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // --- Header Slip Pembayaran ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text("BUKTI PEMBAYARAN", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`${COMPANY_NAME} - Payout Slip`, pageWidth / 2, y, { align: "center" });
    y += 15;

    // Garis pemisah
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // --- Informasi Platform/Pengirim ---
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Dari:", margin, y);
    doc.text(COMPANY_NAME, margin, y + 5);
    doc.text(COMPANY_ADDRESS, margin, y + 10);
    doc.text(COMPANY_EMAIL, margin, y + 15);
    y += 25;

    // --- Informasi Penerima ---
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Untuk:", margin, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(payout.user.fullName, margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Username  : @${payout.user.username}`, margin, y); y += 6;
    doc.text(`Email     : ${payout.user.email}`, margin, y); y += 6;
    doc.text(`WhatsApp  : ${payout.user.whatsapp}`, margin, y); y += 15;

    // Garis pemisah
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // --- Rincian Pembayaran Utama ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("RINGKASAN PEMBAYARAN", pageWidth / 2, y, { align: "center" });
    y += 10;

    const summaryTableData = [
      ["ID Pembayaran", `#${payout.id}`],
      [
        "Jumlah Dibayar",
        `$${payout.amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USD`,
      ],
      ["Tanggal Bayar", format(new Date(payout.paidAt), "dd MMMM yyyy, HH:mm", { locale: id })],
      ["Status", payout.status === "approved" ? "Disetujui" : payout.status === "pending" ? "Tertunda" : "Ditolak"],
    ];

    // ✅ Bentuk fungsi: autoTable(doc, options)
    autoTable(doc, {
      startY: y,
      body: summaryTableData,
      theme: "plain",
      styles: {
        fontSize: 12,
        cellPadding: 2,
        textColor: [50, 50, 50],
      },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [0, 0, 0], cellWidth: 50 },
        1: { halign: "left" },
      },
      margin: { left: margin + 30, right: margin },
      rowPageBreak: "avoid",
      didDrawPage: () => {
        if (doc.getNumberOfPages() > 1) {
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text(`Halaman ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, {
            align: "right",
          });
          doc.text(`Dibuat oleh ${COMPANY_NAME}`, margin, pageHeight - 10);
        }
      },
    });

    // Ambil posisi Y terakhir dari tabel
    y = (doc as any).lastAutoTable.finalY + 15;

    // Garis pemisah
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // --- Detail Penarikan Per Video (Tabel) ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("DETAIL PENARIKAN VIDEO", pageWidth / 2, y, { align: "center" });
    y += 10;

    if (payout.details && payout.details.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Video ID", "Jumlah (USD)"]],
        body: payout.details.map((detail) => [`#${detail.videoId}`, `$${detail.amount.toFixed(2)}`]),
        theme: "striped",
        styles: {
          halign: "center",
          fontSize: 11,
          cellPadding: 2,
          textColor: [50, 50, 50],
        },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
          if (doc.getNumberOfPages() > 1) {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Halaman ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, {
              align: "right",
            });
            doc.text(`Dibuat oleh ${COMPANY_NAME}`, margin, pageHeight - 10);
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Tidak ada detail penarikan video yang tersedia.", margin, y);
      y += 15;
    }

    // --- Footer Umum ---
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(
      `Dibuat pada: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: id })}`,
      margin,
      pageHeight - 10
    );
    doc.text(`Halaman ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: "right" });

    // Simpan PDF
    doc.save(`SlipPembayaran-${payout.user.username}-${payout.id}.pdf`);
  };

  if (payouts.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Belum ada riwayat penarikan.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
              Tanggal
            </th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
              Jumlah
            </th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
              Status
            </th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-transparent">
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
              <td className="px-5 py-4 text-sm text-gray-800 dark:text-gray-200">
                {format(new Date(payout.paidAt), "dd MMM yyyy")}
              </td>
              <td className="px-5 py-4 text-sm text-gray-800 dark:text-gray-200">
                ${payout.amount.toFixed(2)}
              </td>
              <td className="px-5 py-4 text-sm">
                <span
                  className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                    payout.status === "pending"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                      : payout.status === "approved"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                  }`}
                >
                  {payout.status}
                </span>
              </td>
              <td className="px-5 py-4">
                {payout.status === "approved" && (
                  <button
                    onClick={() => handleSinglePayoutPDF(payout)}
                    className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
