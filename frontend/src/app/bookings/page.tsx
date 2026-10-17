
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/AuthProvider";
import { bookingApi } from "@/api/booking_api";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  PublicProvider,
  PublicService,
  Slot,
} from "@/types/booking";
import { dateInputValue } from "@/utils/date_utils";

export default function BookingPage() {
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();

  const [providerId, setProviderId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [day, setDay] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Preserve the exact booking URL when redirecting a guest.
    const currentPath =
      window.location.pathname + window.location.search;

    if (!isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(currentPath)}`
      );
      return;
    }

    // Only customers can create bookings.
    if (user?.role !== "CUSTOMER") {
      setMessage("Please log in with a customer account to book a service.");
      return;
    }

    let cancelled = false;

    async function loadInitialData() {
      const query = new URLSearchParams(window.location.search);
      const providerQuery = query.get("provider_id") ?? "";
      const serviceQuery = query.get("service_id") ?? "";

      setProviderId(providerQuery);
      setServiceId(serviceQuery);
      setMessage("");

      try {
        const [providerPage, servicePage] = await Promise.all([
          bookingApi.providers(),
          bookingApi.services(providerQuery || undefined),
        ]);

        if (cancelled) return;

        setProviders(providerPage.items);
        setServices(servicePage.items);

        let effectiveProviderId = providerQuery;

        // If only a service was selected, recover its provider.
        if (serviceQuery && !providerQuery) {
          const selectedService = servicePage.items.find(
            (service) => service.id === serviceQuery
          );

          if (selectedService) {
            effectiveProviderId = selectedService.provider_id;
            setProviderId(effectiveProviderId);
          }
        }

        const provider = providerPage.items.find(
          (item) => item.id === effectiveProviderId
        );

        if (provider?.timezone) {
          setDay(dateInputValue(new Date(), provider.timezone));
        }

        setReady(true);
      } catch (error) {
        if (cancelled) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load providers and services."
        );
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, user?.role, router]);

  async function chooseProvider(id: string) {
    setProviderId(id);
    setServiceId("");
    setSlots([]);
    setSelected("");
    setMessage("");

    const provider = providers.find((item) => item.id === id);

    if (provider?.timezone) {
      setDay(dateInputValue(new Date(), provider.timezone));
    }

    try {
      setServices(
        (await bookingApi.services(id || undefined)).items
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load services."
      );
    }
  }

  async function loadSlots() {
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      const currentPath =
        window.location.pathname + window.location.search;

      router.replace(
        `/login?next=${encodeURIComponent(currentPath)}`
      );
      return;
    }

    setMessage("");
    setSelected("");

    try {
      setSlots(
        await bookingApi.slots(
          providerId,
          serviceId,
          day,
          day
        )
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load availability."
      );
    }
  }

  async function book() {
    if (!selected || busy) return;

    // Do not attempt booking or payment as a guest.
    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      const currentPath =
        window.location.pathname + window.location.search;

      router.replace(
        `/login?next=${encodeURIComponent(currentPath)}`
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const booking = await bookingApi.create(
        providerId,
        serviceId,
        selected
      );

      const payment = await bookingApi.payment(booking.id);

      await bookingApi.mockPay(payment.id);

      setMessage(
        "Mock payment succeeded. Your booking is confirmed."
      );

      await loadSlots();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Booking could not be completed."
      );
    } finally {
      setBusy(false);
    }
  }

  // Wait until the session has been checked.
  if (loading || (!isAuthenticated && !message)) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm text-muted">
          Checking your session...
        </p>
      </main>
    );
  }

  // Guests are being redirected to login.
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated providers/admins cannot use customer booking.
  if (user?.role !== "CUSTOMER") {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Card className="space-y-3 p-5">
          <h1 className="text-2xl font-bold">
            Customer account required
          </h1>
          <p className="text-muted">
            Please log in with a customer account to book a service.
          </p>
          {message && (
            <p role="status" className="text-sm text-muted">
              {message}
            </p>
          )}
          <Button onClick={() => router.push("/")}>
            Return to home
          </Button>
        </Card>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm text-muted">
          {message || "Loading providers and services..."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          Booking
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Choose an appointment
        </h1>
        <p className="mt-2 text-muted">
          Times are shown in the provider’s local timezone.
        </p>
      </header>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Provider
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={providerId}
              onChange={(event) =>
                void chooseProvider(event.target.value)
              }
            >
              <option value="">Select a provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.business_name}
                  {provider.city ? ` · ${provider.city}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Service
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setSlots([]);
                setSelected("");
              }}
              disabled={!providerId}
            >
              <option value="">Select a service</option>
              {services
                .filter(
                  (service) =>
                    service.provider_id === providerId
                )
                .map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · PKR{" "}
                    {Number(service.price).toLocaleString()} ·{" "}
                    {service.duration_minutes} min
                  </option>
                ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Date
            <input
              type="date"
              className="mt-1 w-full rounded-md border p-2"
              value={day}
              onChange={(event) => {
                setDay(event.target.value);
                setSlots([]);
                setSelected("");
              }}
            />
          </label>
        </div>

        <Button
          onClick={loadSlots}
          disabled={!providerId || !serviceId}
        >
          Find available times
        </Button>

        {slots.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.start_at}
                type="button"
                onClick={() => setSelected(slot.start_at)}
                className={`rounded-md border p-3 text-sm ${
                  selected === slot.start_at
                    ? "border-brand bg-brand-soft"
                    : ""
                }`}
              >
                {new Date(slot.start_at).toLocaleTimeString(
                  [],
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: slot.provider_timezone,
                  }
                )}
              </button>
            ))}
          </div>
        )}

        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}

        <Button
          onClick={book}
          disabled={!selected || busy}
        >
          {busy ? "Processing…" : "Book and pay (mock)"}
        </Button>
      </Card>
    </main>
  );
}
