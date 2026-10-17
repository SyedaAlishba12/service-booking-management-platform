
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/AuthProvider";
import { bookingApi } from "@/api/booking_api";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type {
  PublicProvider,
  PublicService,
  Slot,
} from "@/types/booking";
import { dateInputValue } from "@/utils/date_utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Book a Service", href: "/booking" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Services", href: "/services?view=dashboard" },
  { label: "Providers", href: "/providers?view=dashboard" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/customer/profile" },
];

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
  const [slotsError, setSlotsError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [refreshSlots, setRefreshSlots] = useState(0);

  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    const currentPath =
      window.location.pathname + window.location.search;

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (user?.role !== "CUSTOMER") return;

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

  // Load availability after selections settle, and reset it when
  // the required selections are incomplete.
  useEffect(() => {
    let cancelled = false;

    const canLoadSlots =
      ready &&
      isAuthenticated &&
      user?.role === "CUSTOMER" &&
      Boolean(providerId) &&
      Boolean(serviceId) &&
      Boolean(day);

    const timer = window.setTimeout(
      async () => {
        if (cancelled) return;

        if (!canLoadSlots) {
          setSlots([]);
          setSelected("");
          setLoadingSlots(false);
          return;
        }

        setSlots([]);
        setSelected("");
        setSlotsError("");
        setLoadingSlots(true);

        try {
          const available = await bookingApi.slots(
            providerId,
            serviceId,
            day,
            day
          );

          if (cancelled) return;

          setSlots(available);

          if (available.length === 0) {
            setSlotsError(
              "No available times for this date. Try another date."
            );
          }
        } catch (error) {
          if (cancelled) return;

          setSlotsError(
            error instanceof Error
              ? error.message
              : "Could not load available times. Please try again."
          );
        } finally {
          if (!cancelled) {
            setLoadingSlots(false);
          }
        }
      },
      canLoadSlots ? 250 : 0
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    ready,
    isAuthenticated,
    user?.role,
    providerId,
    serviceId,
    day,
    refreshSlots,
  ]);

  async function chooseProvider(id: string) {
    setProviderId(id);
    setServiceId("");
    setServices([]);
    setSlots([]);
    setSelected("");
    setSlotsError("");
    setMessage("");

    const provider = providers.find((item) => item.id === id);

    if (provider?.timezone) {
      setDay(dateInputValue(new Date(), provider.timezone));
    }

    if (!id) return;

    try {
      const servicePage = await bookingApi.services(id);
      setServices(servicePage.items);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load services."
      );
    }
  }

  async function book() {
    if (!selected || busy) return;

    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      const currentPath =
        window.location.pathname + window.location.search;

      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
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

      setSelected("");
      setRefreshSlots((value) => value + 1);
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

  if (loading || (!isAuthenticated && !message)) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-sm text-muted">
          Checking your session...
        </p>
      </main>
    );
  }

  if (!isAuthenticated) return null;

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
    <DashboardLayout
      sidebarItems={NAV_ITEMS}
      activeHref="/booking"
      title="Book a Service"
      description="Find a provider and choose an available appointment."
    >
      <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            Customer workspace
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Book a Service
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Choose your provider, select a service, and book a time that
            works for you.
          </p>
        </header>

        {message && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm ${
              message.startsWith("Mock payment succeeded")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-muted"
            }`}
          >
            {message}
            {message.startsWith("Mock payment succeeded") && (
              <div className="mt-3">
                <Button onClick={() => router.push("/bookings")}>
                  View my bookings
                </Button>
              </div>
            )}
          </div>
        )}

        <Card className="space-y-6 rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-7">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold">
              Appointment details
            </h2>
            <p className="mt-1 text-sm text-muted">
              Start by choosing the provider and service you need.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span className="block">Provider</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                value={providerId}
                onChange={(event) =>
                  void chooseProvider(event.target.value)
                }
              >
                <option value="">Select a provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.business_name}
                    {provider.city ? ` — ${provider.city}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium">
              <span className="block">Service</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                value={serviceId}
                onChange={(event) => {
                  setServiceId(event.target.value);
                  setSlots([]);
                  setSelected("");
                  setSlotsError("");
                }}
                disabled={!providerId}
              >
                <option value="">Select a service</option>
                {services
                  .filter(
                    (service) => service.provider_id === providerId
                  )
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — PKR{" "}
                      {Number(service.price).toLocaleString()} —{" "}
                      {service.duration_minutes} min
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium md:col-span-2">
              <span className="block">Appointment date</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 md:max-w-sm"
                value={day}
                onChange={(event) => {
                  setDay(event.target.value);
                  setSlots([]);
                  setSelected("");
                  setSlotsError("");
                }}
                disabled={!providerId || !serviceId}
              />
            </label>
          </div>

          <section
            aria-live="polite"
            className="space-y-4 border-t border-slate-100 pt-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Available appointment times
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {providerId && serviceId
                    ? "Select an available time slot below."
                    : "Choose a provider and service to see available times."}
                </p>
              </div>

              {providerId && serviceId && day && (
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-brand transition hover:bg-slate-50 disabled:opacity-50"
                  onClick={() =>
                    setRefreshSlots((value) => value + 1)
                  }
                  disabled={loadingSlots}
                >
                  Refresh times
                </button>
              )}
            </div>

            {!providerId || !serviceId ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm text-muted">
                  Your available times will appear here once you select a
                  provider and service.
                </p>
              </div>
            ) : loadingSlots ? (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-5">
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                />
                <p className="text-sm text-muted">
                  Checking available appointment times...
                </p>
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.start_at}
                    type="button"
                    onClick={() => setSelected(slot.start_at)}
                    aria-pressed={selected === slot.start_at}
                    className={`rounded-xl border p-4 text-sm font-medium transition ${
                      selected === slot.start_at
                        ? "border-brand bg-brand-soft text-brand ring-1 ring-brand"
                        : "border-slate-200 bg-white hover:border-brand/50 hover:bg-slate-50"
                    }`}
                  >
                    {new Date(slot.start_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: slot.provider_timezone || "UTC",
                    })}
                    {selected === slot.start_at && (
                      <span className="mt-1 block text-xs">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : slotsError ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">{slotsError}</p>
                <button
                  type="button"
                  className="text-sm font-semibold text-amber-900 underline"
                  onClick={() =>
                    setRefreshSlots((value) => value + 1)
                  }
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-muted">
                No time slots are currently displayed.
              </div>
            )}
          </section>

          <div className="border-t border-slate-100 pt-5">
            <Button
              onClick={book}
              disabled={!selected || busy || loadingSlots}
            >
              {busy ? "Processing..." : "Confirm booking and pay"}
            </Button>
            <p className="mt-2 text-xs text-muted">
              Demo payment is simulated in this project.
            </p>
          </div>
        </Card>
      </main>
    </DashboardLayout>
  );
}
