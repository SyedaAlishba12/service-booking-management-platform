"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/api/booking_api";
import BookingCard from "@/components/ui/BookingCard";
import Button from "@/components/ui/Button";
import type { Status } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import type { Booking, Page, Slot } from "@/types/booking";
import { dateInputValue } from "@/utils/date_utils";

export default function MyBookingsPage() {
  const [data, setData] = useState<Page<Booking> | null>(null);
  const [error, setError] = useState("");
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [busyId, setBusyId] = useState("");
  async function refresh() { try { setData(await bookingApi.mine()); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load bookings"); } }
  useEffect(() => { void refresh(); }, []);
  async function cancel(id: string) { try { await bookingApi.cancel(id, "Cancelled by customer"); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not cancel booking"); } }
  async function loadRescheduleSlots() {
    if (!rescheduling || !rescheduleDate) return;
    try { setSlots(await bookingApi.slots(rescheduling.provider_id, rescheduling.service_id, rescheduleDate, rescheduleDate)); setSelectedSlot(""); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load available times"); }
  }
  async function saveReschedule() {
    if (!rescheduling || !selectedSlot) return;
    setBusyId(rescheduling.id);
    try { await bookingApi.reschedule(rescheduling.id, selectedSlot); setRescheduling(null); setSlots([]); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reschedule booking"); }
    finally { setBusyId(""); }
  }
  async function pay(item: Booking) {
    setBusyId(item.id); setError("");
    try {
      let payment = await bookingApi.payment(item.id);
      if (payment.status === "FAILED") payment = await bookingApi.retryPayment(payment.id);
      await bookingApi.mockPay(payment.id);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Payment could not be completed"); }
    finally { setBusyId(""); }
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-5 py-10"><header><h1 className="text-3xl font-bold">My bookings</h1><p className="mt-2 text-muted">Your upcoming and past appointments.</p></header>
    {error && <Card className="p-4 text-sm text-red-700">{error}</Card>}
    <div className="space-y-3">{data?.items.map(item => <div key={item.id}>
      <BookingCard serviceName={item.service_name ?? `Service ${item.service_id.slice(0, 8)}`} providerName={item.provider_name ?? `Provider ${item.provider_id.slice(0, 8)}`} date={new Date(item.start_at).toLocaleDateString([], { timeZone: item.provider_timezone ?? undefined })} time={new Date(item.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: item.provider_timezone ?? undefined })} status={item.status.toLowerCase() as Status} price={Number(item.price)} onAction={item.status === "PENDING" || item.status === "CONFIRMED" ? () => void cancel(item.id) : undefined} actionLabel="Cancel" />
      {item.status === "PENDING" || item.status === "CONFIRMED" ? <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setRescheduling(item); setRescheduleDate(dateInputValue(item.start_at, item.provider_timezone ?? "UTC")); setSlots([]); setSelectedSlot(""); }}>Reschedule</Button>
        {item.status === "PENDING" && item.payment_status !== "PAID" && <Button size="sm" disabled={busyId === item.id} onClick={() => void pay(item)}>{busyId === item.id ? "Processing…" : item.payment_status === "FAILED" ? "Retry mock payment" : "Pay (mock)"}</Button>}
      </div> : null}
      {rescheduling?.id === item.id && <Card className="mt-3 space-y-3 p-4">
        <p className="font-semibold">Choose a new time in {item.provider_timezone ?? "the provider’s timezone"}</p>
        <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Date<input type="date" className="mt-1 block rounded-md border p-2" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></label><Button variant="outline" onClick={() => void loadRescheduleSlots()}>Find times</Button></div>
        {slots.length > 0 && <div className="flex flex-wrap gap-2">{slots.map(slot => <button key={slot.start_at} onClick={() => setSelectedSlot(slot.start_at)} className={`rounded-md border px-3 py-2 text-sm ${selectedSlot === slot.start_at ? "border-brand bg-brand-soft" : ""}`}>{new Date(slot.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: slot.provider_timezone })}</button>)}</div>}
        <div className="flex gap-2"><Button size="sm" disabled={!selectedSlot || busyId === item.id} onClick={() => void saveReschedule()}>{busyId === item.id ? "Saving…" : "Confirm new time"}</Button><Button size="sm" variant="ghost" onClick={() => setRescheduling(null)}>Close</Button></div>
      </Card>}
    </div>)}</div>
    {data?.items.length === 0 && <Card className="p-6 text-muted">You have no bookings yet.</Card>}
  </main>;
}
