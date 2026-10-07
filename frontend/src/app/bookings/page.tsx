"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/api/booking_api";
import BookingCard from "@/components/ui/BookingCard";
import type { Status } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import type { Booking, Page } from "@/types/booking";

export default function MyBookingsPage() {
  const [data, setData] = useState<Page<Booking> | null>(null);
  const [error, setError] = useState("");
  async function refresh() { try { setData(await bookingApi.mine()); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load bookings"); } }
  useEffect(() => { void refresh(); }, []);
  async function cancel(id: string) { try { await bookingApi.cancel(id, "Cancelled by customer"); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not cancel booking"); } }
  return <main className="mx-auto max-w-5xl space-y-6 px-5 py-10"><header><h1 className="text-3xl font-bold">My bookings</h1><p className="mt-2 text-muted">Your upcoming and past appointments.</p></header>
    {error && <Card className="p-4 text-sm text-red-700">{error}</Card>}
    <div className="space-y-3">{data?.items.map(item => <BookingCard key={item.id} serviceName={item.service_name ?? `Service ${item.service_id.slice(0, 8)}`} providerName={item.provider_name ?? `Provider ${item.provider_id.slice(0, 8)}`} date={new Date(item.start_at).toLocaleDateString()} time={new Date(item.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} status={item.status.toLowerCase() as Status} price={Number(item.price)} onAction={item.status === "PENDING" || item.status === "CONFIRMED" ? () => void cancel(item.id) : undefined} actionLabel="Cancel" />)}</div>
    {data?.items.length === 0 && <Card className="p-6 text-muted">You have no bookings yet.</Card>}
  </main>;
}
