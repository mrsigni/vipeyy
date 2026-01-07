import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import PaymentHistoryTable from "./PaymentHistoryTable";
import React from "react";

export const metadata: Metadata = {
  title: "Payment History | Vipey",
  description: "Lihat riwayat pembayaran Anda",
};

export default async function PaymentHistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("vipeysession")?.value;

  if (!token) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Unauthorized. Please log in.</p>
      </div>
    );
  }

  let userId: string | null = null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );
    userId = payload.userId as string;
  } catch (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Invalid token.</p>
      </div>
    );
  }

   const payouts = await prisma.videoPayout.findMany({
    where: { userId: userId },
    include: {
      user: { // <-- Pastikan ini ada!
        select: {
          fullName: true,
          username: true,
          email: true,
          whatsapp: true,
        },
      },
      details: true, // <-- Pastikan ini ada!
    },
    orderBy: { paidAt: "desc" },
  });

  return (
    <div>
      <PageBreadcrumb pageTitle="Payment History" />
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-6 text-xl font-bold text-gray-800 dark:text-white">
          Riwayat Pembayaran
        </h2>
        <PaymentHistoryTable payouts={payouts} />
      </div>
    </div>
  );
}