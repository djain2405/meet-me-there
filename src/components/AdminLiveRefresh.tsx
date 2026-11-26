"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLiveRefresh() {
  const router = useRouter();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/admin/health", { cache: "no-store" });
        if (!response.ok) throw new Error("refresh failed");
        setStale(false);
        router.refresh();
      } catch {
        setStale(true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [router]);

  if (!stale) return null;

  return (
    <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      This page may be out of date. The latest refresh did not succeed.
    </p>
  );
}
