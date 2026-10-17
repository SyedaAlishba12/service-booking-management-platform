
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/AuthProvider";
import { bookingApi } from "@/api/booking_api";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ReviewForm from "@/components/reviews/ReviewForm";
import { useMyReviews } from "@/hooks/useMyReviews";
import type { Review } from "@/types/review";
import type { Booking, Page, Slot } from "@/types/booking";
import { dateInputValue } from "@/utils/date_utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Book a Service", href: "/booking" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Services", href: "/services" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/customer/profile" },
];

function formatBookingDate(booking: Booking): string {
  return new Date(booking.start_at).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
    ...(booking.provider_timezone
      ? { timeZone: booking.provider_timezone }
      : {}),
  });
}

function formatPrice(price: string | number): string {
  return `PKR ${Number(price).toLocaleString()}`;
}

function readableStatus(status: string): string {
  return status.replaceAll("_", " ");
}

function statusClasses(status: string): string {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
      return "bg-emerald-100 text-emerald-800";
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "CANCELLED":
    case "FAILED":
    case "NO_SHOW":
      return "bg-rose-100 text-rose-800";
    case "COMPLETED":
      return "bg-sky-100 text-sky-800";
    case "REFUNDED":
      return "bg-violet-100 text-violet-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);

  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDay, setRescheduleDay] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // Only one booking's review form can be open at a time.
  const [reviewingBookingId, setReviewingBookingId] = useState<
    string | null
  >(null);

  const {
    data: myReviewsData,
    isLoading: loadingReviews,
  } = useMyReviews({ page: 1, page_size: 100 });

  const myReviews: Review[] = myReviewsData?.items ?? [];

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    setPageError("");

    try {
      const result: Page<Booking> = await bookingApi.mine(1, 100);
      setBookings(result.items ?? []);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not load your bookings. Please try again."
      );
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const currentPath =
        window.location.pathname + window.location.search;

      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (user?.role !== "CUSTOMER") {
      setLoadingBookings(false);
      return;
    }

    void loadBookings();
  }, [
    loading,
    isAuthenticated,
    user?.role,
    router,
    loadBookings,
  ]);

  function closeReschedule() {
    setReschedulingId(null);
    setRescheduleDay("");
    setSlots([]);
    setSelectedSlot("");
    setLoadingSlots(false);
    setRescheduleError("");
  }

  function openReschedule(booking: Booking) {
    const timezone = booking.provider_timezone || "UTC";

    setReschedulingId(booking.id);
    setRescheduleDay(
      dateInputValue(new Date(booking.start_at), timezone)
    );
    setSlots([]);
    setSelectedSlot("");
    setRescheduleError("");
    setNotice("");
  }

  async function findSlots(booking: Booking) {
    if (!rescheduleDay || loadingSlots) return;

    setLoadingSlots(true);
    setRescheduleError("");
    setSelectedSlot("");
    setSlots([]);

    try {
      const available = await bookingApi.slots(
        booking.provider_id,
        booking.service_id,
        rescheduleDay,
        rescheduleDay
      );

      setSlots(available);

      if (available.length === 0) {
        setRescheduleError(
          "No available appointments were found for this date. Try another date."
        );
      }
    } catch (error) {
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "Could not load available appointments."
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  async function cancelBooking(booking: Booking) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel your ${booking.service_name || "service"} appointment on ${formatBookingDate(booking)}? The applicable refund policy will be handled by the server.`
    );

    if (!confirmed) return;

    setBusyBookingId(booking.id);
    setPageError("");
    setNotice("");

    try {
      await bookingApi.cancel(booking.id);
      closeReschedule();
      setNotice("Your booking has been cancelled.");
      await loadBookings();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not cancel this booking."
      );
    } finally {
      setBusyBookingId(null);
    }
  }

  async function saveReschedule(booking: Booking) {
    if (!selectedSlot || busyBookingId) return;

    setBusyBookingId(booking.id);
    setPageError("");
    setRescheduleError("");
    setNotice("");

    try {
      await bookingApi.reschedule(booking.id, selectedSlot);
      closeReschedule();
      setNotice("Your appointment has been rescheduled.");
      await loadBookings();
    } catch (error) {
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "Could not reschedule this booking. Please try another slot."
      );
    } finally {
      setBusyBookingId(null);
    }
  }

  if (loading || (!isAuthenticated && !pageError)) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-sm text-muted">Checking your session...</p>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  if (user?.role !== "CUSTOMER") {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Card className="space-y-4 p-6">
          <h1 className="text-2xl font-bold">Customer account required</h1>
          <p className="text-muted">
            My Bookings is available to customer accounts.
          </p>
          <Button onClick={() => router.push("/")}>
            Return to home
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <DashboardLayout
      sidebarItems={NAV_ITEMS}
      activeHref="/bookings"
      title="My Bookings"
      description="Manage your appointments and review completed services."
    >
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              Customer dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">My Bookings</h1>
            <p className="mt-2 text-muted">
              View your appointments, cancel eligible bookings, choose a
              new available time, and review completed services.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/booking")}>
              Book a service
            </Button>
            <Button
              onClick={() => void loadBookings()}
              disabled={loadingBookings}
            >
              {loadingBookings ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </header>

        {notice && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        {pageError && (
          <div
            role="alert"
            className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <p>{pageError}</p>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void loadBookings()}
            >
              Try again
            </button>
          </div>
        )}

        {loadingBookings ? (
          <Card className="p-6">
            <p className="text-sm text-muted">Loading your bookings...</p>
          </Card>
        ) : bookings.length === 0 ? (
          <Card className="space-y-4 p-8 text-center">
            <h2 className="text-xl font-semibold">No bookings yet</h2>
            <p className="text-muted">
              Your appointments will appear here after you create a booking.
            </p>
            <div>
              <Button onClick={() => router.push("/booking")}>
                Find a service
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Showing {bookings.length} booking
              {bookings.length === 1 ? "" : "s"} from the latest results.
            </p>

            {bookings.map((booking) => {
              const canManage =
                booking.status === "PENDING" ||
                booking.status === "CONFIRMED";

              const isBusy = busyBookingId === booking.id;
              const isRescheduling = reschedulingId === booking.id;

              const canReview = booking.status === "COMPLETED";
              const existingReview = myReviews.find(
                (review) => review.booking_id === booking.id
              );
              const isReviewing = reviewingBookingId === booking.id;

              return (
                <Card key={booking.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {booking.service_name || "Service appointment"}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Provider: {booking.provider_name || "Provider"}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {formatBookingDate(booking)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(booking.status)}`}
                      >
                        {readableStatus(booking.status)}
                      </span>

                      {booking.payment_status && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(booking.payment_status)}`}
                        >
                          Payment: {readableStatus(booking.payment_status)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Appointment price
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatPrice(booking.price)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Booking reference
                      </p>
                      <p className="mt-1 break-all text-sm">
                        {booking.id}
                      </p>
                    </div>
                  </div>

                  {booking.notes && (
                    <div>
                      <p className="text-sm font-medium">Your notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                        {booking.notes}
                      </p>
                    </div>
                  )}

                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => void cancelBooking(booking)}
                        disabled={isBusy}
                      >
                        {isBusy ? "Please wait..." : "Cancel booking"}
                      </Button>

                      {isRescheduling ? (
                        <Button
                          onClick={closeReschedule}
                          disabled={isBusy}
                        >
                          Close rescheduling
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openReschedule(booking)}
                          disabled={isBusy}
                        >
                          Reschedule
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      This booking is no longer eligible for cancellation or
                      rescheduling.
                    </p>
                  )}

                  {isRescheduling && canManage && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div>
                        <h3 className="font-semibold">
                          Choose a new appointment time
                        </h3>
                        <p className="mt-1 text-sm text-muted">
                          Times are shown in the provider&apos;s local
                          timezone.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <label className="text-sm font-medium">
                          New date
                          <input
                            type="date"
                            className="mt-1 block rounded-md border p-2"
                            value={rescheduleDay}
                            onChange={(event) => {
                              setRescheduleDay(event.target.value);
                              setSlots([]);
                              setSelectedSlot("");
                              setRescheduleError("");
                            }}
                          />
                        </label>

                        <Button
                          onClick={() => void findSlots(booking)}
                          disabled={!rescheduleDay || loadingSlots || isBusy}
                        >
                          {loadingSlots
                            ? "Finding times..."
                            : "Find available times"}
                        </Button>
                      </div>

                      {slots.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {slots.map((slot) => (
                            <button
                              key={slot.start_at}
                              type="button"
                              onClick={() => setSelectedSlot(slot.start_at)}
                              className={`rounded-md border p-3 text-sm ${
                                selectedSlot === slot.start_at
                                  ? "border-brand bg-brand-soft font-semibold"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              {new Date(slot.start_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  timeZone:
                                    slot.provider_timezone ||
                                    booking.provider_timezone ||
                                    "UTC",
                                }
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {rescheduleError && (
                        <p role="alert" className="text-sm text-rose-700">
                          {rescheduleError}
                        </p>
                      )}

                      <Button
                        onClick={() => void saveReschedule(booking)}
                        disabled={!selectedSlot || isBusy || loadingSlots}
                      >
                        {isBusy ? "Saving..." : "Confirm new time"}
                      </Button>
                    </div>
                  )}

                  {canReview && (
                    <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Your review</h3>
                          <p className="mt-1 text-sm text-muted">
                            Share your experience with this service provider.
                          </p>
                        </div>

                        {existingReview ? (
                          <Button
                            onClick={() =>
                              setReviewingBookingId(
                                isReviewing ? null : booking.id
                              )
                            }
                          >
                            {isReviewing ? "Close review" : "Edit review"}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setReviewingBookingId(booking.id)}
                            disabled={loadingReviews}
                          >
                            {loadingReviews
                              ? "Checking review..."
                              : "Write a review"}
                          </Button>
                        )}
                      </div>

                      {existingReview && !isReviewing && (
                        <div className="space-y-2">
                          <p
                            className="text-amber-600"
                            aria-label={`${existingReview.rating} out of 5 stars`}
                          >
                            {"★".repeat(existingReview.rating)}
                            {"☆".repeat(5 - existingReview.rating)}
                            <span className="ml-2 text-sm font-medium text-foreground">
                              {existingReview.rating}/5
                            </span>
                          </p>

                          {existingReview.comment && (
                            <p className="whitespace-pre-wrap text-sm text-muted">
                              {existingReview.comment}
                            </p>
                          )}
                        </div>
                      )}

                      {isReviewing && (
                        <ReviewForm
                          key={`${booking.id}-${existingReview?.id ?? "new"}`}
                          bookingId={booking.id}
                          existingReview={existingReview}
                          onCancel={() => setReviewingBookingId(null)}
                          onSuccess={(savedReview) => {
                            setReviewingBookingId(null);
                            setNotice(
                              savedReview
                                ? "Your review has been saved successfully."
                                : "Your review has been deleted."
                            );
                          }}
                        />
                      )}
                    </section>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
