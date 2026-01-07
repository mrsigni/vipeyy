import { Suspense } from "react";
import OtpPageClient from "./client";

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Memuat halaman verifikasi...</div>}>
      <OtpPageClient />
    </Suspense>
  );
}