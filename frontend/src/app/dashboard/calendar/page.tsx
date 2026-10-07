"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/api/booking_api";
import BookingCard from "@/components/ui/BookingCard";
import type { Status } from "@/components/ui/StatusBadge";
import ProviderShell from "@/components/provider/ProviderShell";
import { Card } from "@/components/ui/Card";
import type { Booking } from "@/types/booking";

export default function ProviderCalendarPage() {
  const [items, setItems] = useState<Booking[]>([]); const [error, setError] = useState("");
  useEffect(() => { const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 7); bookingApi.calendar(start.toISOString(), end.toISOString()).then(setItems).catch(e => setError(e instanceof Error ? e.message : "Could not load calendar")); }, []);
  return <ProviderShell activeHref="/dashboard/calendar" title="Calendar" description="Your upcoming appointments for the next seven days."><div className="space-y-4">{error && <Card className="p-4 text-red-700">{error}</Card>}{items.map(item => <BookingCard key={item.id} serviceName={item.service_name ?? `Service ${item.service_id.slice(0, 8)}`} customerName={item.customer_name ?? `Customer ${item.customer_id.slice(0, 8)}`} date={new Date(item.start_at).toLocaleDateString([], { timeZone: item.provider_timezone ?? undefined })} time={new Date(item.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: item.provider_timezone ?? undefined })} status={item.status.toLowerCase() as Status} price={Number(item.price)} />)}{items.length === 0 && !error && <Card className="p-6 text-muted">No appointments in the next seven days.</Card>}</div></ProviderShell>;
}
