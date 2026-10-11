"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/api/booking_api";
import BookingCard from "@/components/ui/BookingCard";
import type { Status } from "@/components/ui/StatusBadge";
import ProviderShell from "@/components/provider/ProviderShell";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/types/booking";

export default function ProviderBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]); const [error, setError] = useState("");
  async function refresh() { const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 14); try { const result = await bookingApi.providerBookings(start.toISOString(), end.toISOString()); setItems(result.items); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load provider bookings"); } }
  useEffect(() => { void refresh(); }, []);
  async function act(id: string, action: "confirm" | "complete" | "no-show") { try { if (action === "confirm") await bookingApi.confirm(id); else if (action === "complete") await bookingApi.complete(id); else await bookingApi.noShow(id); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not update booking"); } }
  return <ProviderShell activeHref="/dashboard/bookings" title="Bookings" description="Manage appointments for your services."><div className="space-y-4">{error && <Card className="p-4 text-red-700">{error}</Card>}{items.map(item => <BookingCard key={item.id} serviceName={item.service_name ?? `Service ${item.service_id.slice(0, 8)}`} customerName={item.customer_name ?? `Customer ${item.customer_id.slice(0, 8)}`} date={new Date(item.start_at).toLocaleDateString([], { timeZone: item.provider_timezone ?? undefined })} time={new Date(item.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: item.provider_timezone ?? undefined })} status={item.status.toLowerCase() as Status} price={Number(item.price)} onAction={item.status === "PENDING" ? () => void act(item.id, "confirm") : item.status === "CONFIRMED" ? () => void act(item.id, "complete") : undefined} actionLabel={item.status === "PENDING" ? "Confirm" : "Complete"} />)}{items.length === 0 && !error && <Card className="p-6 text-muted">No appointments in the next two weeks.</Card>}</div></ProviderShell>;
}
