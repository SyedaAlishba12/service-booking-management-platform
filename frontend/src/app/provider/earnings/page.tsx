"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/api/booking_api";
import ProviderShell from "@/components/provider/ProviderShell";
import { Card } from "@/components/ui/Card";

type Earnings = { gross_paid: number | string; commission_rate_percent: number | string; commission_amount: number | string; net_earnings: number | string; pending_amount: number | string; refunded_amount: number | string };
const money = (value: unknown) => `PKR ${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ProviderEarningsPage() {
  const [data, setData] = useState<Earnings | null>(null); const [error, setError] = useState("");
  useEffect(() => { bookingApi.earnings().then(result => setData(result as Earnings)).catch(e => setError(e instanceof Error ? e.message : "Could not load earnings")); }, []);
  const rows: [string, unknown][] = [["Net earnings", data?.net_earnings], ["Gross paid", data?.gross_paid], ["Pending payments", data?.pending_amount], ["Refunded", data?.refunded_amount], ["Platform commission", data?.commission_amount]];
  return <ProviderShell activeHref="/dashboard/earnings" title="Earnings" description="Payment totals and your estimated net earnings."><div className="grid gap-4 sm:grid-cols-2">{error && <Card className="p-5 text-red-700">{error}</Card>}{rows.map(([label, value]) => <Card key={label} className="p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{data ? money(value) : "—"}</p></Card>)}</div>{data && <p className="mt-4 text-sm text-muted">Commission rate: {Number(data.commission_rate_percent).toFixed(2)}%</p>}</ProviderShell>;
}
