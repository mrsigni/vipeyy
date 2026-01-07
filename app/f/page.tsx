"use client";

import { Suspense } from "react";
import VideoFromParam from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VideoFromParam />
    </Suspense>
  );
}