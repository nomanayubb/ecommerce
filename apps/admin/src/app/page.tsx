"use client";

import { useEffect, useState } from "react";
import { api, pkr } from "@/lib/api";

export default function Dashboard() {
  const [s, setS] = useState<{ orders: string; revenue: string; aov: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<typeof s>("/admin/analytics/summary").then(setS).catch((e) => setError(e.message)); }, []);

  const tile = (label: string, value: string) => (
    <div className="rounded-xl border border-line bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Dashboard <span className="text-sm font-normal text-muted">last 30 days</span></h1>
      {error && <p className="text-red-500">{error}</p>}
      {s && (
        <div className="grid gap-4 sm:grid-cols-3">
          {tile("Orders", s.orders)}
          {tile("Revenue", pkr(s.revenue))}
          {tile("Average order", pkr(Math.round(Number(s.aov))))}
        </div>
      )}
    </>
  );
}
