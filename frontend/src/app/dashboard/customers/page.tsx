"use client";

import { useEffect, useState } from "react";
import { bookingApi } from "@/api/booking_api";
import ProviderShell from "@/components/provider/ProviderShell";
import { Card } from "@/components/ui/Card";
import type { ProviderCustomer } from "@/types/booking";

export default function ProviderCustomersPage() {
  const [customers, setCustomers] = useState<ProviderCustomer[]>([]); const [error, setError] = useState("");
  useEffect(() => { bookingApi.customers().then(setCustomers).catch(e => setError(e instanceof Error ? e.message : "Could not load customers")); }, []);
  return <ProviderShell activeHref="/dashboard/customers" title="Customers" description="Customers who have booked one of your services."><div className="space-y-3">{error && <Card className="p-4 text-red-700">{error}</Card>}{customers.map(customer => <Card key={customer.customer_id} className="p-4"><p className="font-semibold">{customer.customer_name}</p><p className="mt-1 text-sm text-muted">{customer.booking_count} bookings · Last booking {customer.last_booking_at ? new Date(customer.last_booking_at).toLocaleDateString() : "—"}</p></Card>)}{customers.length === 0 && !error && <Card className="p-6 text-muted">No customers yet.</Card>}</div></ProviderShell>;
}
