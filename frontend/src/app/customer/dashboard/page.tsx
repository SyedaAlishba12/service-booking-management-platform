
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiClient } from "@/utils/api_client";

type RecordData = Record<string, unknown>;

type DashboardState = {
  user: RecordData | null;
  bookings: RecordData[];
  notifications: RecordData[];
  services: RecordData[];
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Book a Service", href: "/booking" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Services", href: "/services?view=dashboard" },
  { label: "Providers", href: "/providers?view=dashboard" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/customer/profile" },
];

function isRecord(value: unknown): value is RecordData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecordArray(value: unknown): RecordData[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) return [];

  for (const key of ["items", "results", "records", "data"]) {
    const candidate = value[key];

    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  const nestedData = value.data;

  if (isRecord(nestedData)) {
    for (const key of ["items", "results", "records"]) {
      const candidate = nestedData[key];

      if (Array.isArray(candidate)) {
        return candidate.filter(isRecord);
      }
    }
  }

  return [];
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return "";
}

function fieldText(
  record: RecordData | null,
  key: string,
  fallback = "",
): string {
  if (!record) return fallback;

  const value = textValue(record[key]);
  return value || fallback;
}

function bookingDateValue(booking: RecordData): unknown {
  return (
    booking.start_at ??
    booking.start_time ??
    booking.booking_date
  );
}

function bookingTime(booking: RecordData): number {
  const value = bookingDateValue(booking);

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const timestamp = new Date(String(value)).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function dateLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Date not available";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(value: unknown): string {
  return String(value ?? "PENDING")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isFinished(booking: RecordData): boolean {
  const status = fieldText(booking, "status").toUpperCase();

  return ["CANCELLED", "COMPLETED", "NO_SHOW", "REJECTED"].some(
    (item) => status.includes(item),
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function CustomerDashboardPage() {
  const { user: authUser } = useAuth();

  const [data, setData] = useState<DashboardState>({
    user: null,
    bookings: [],
    notifications: [],
    services: [],
  });

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setPageError("");
    setBookingError("");
    setNotificationError("");

    const [
      userResult,
      bookingResult,
      notificationResult,
      serviceResult,
    ] = await Promise.allSettled([
      apiClient.get<unknown>("/api/users/me"),
      apiClient.get<unknown>("/api/bookings?page=1&page_size=100"),
      apiClient.get<unknown>("/api/notifications/unread"),
      apiClient.get<unknown>("/api/services?page=1&page_size=6"),
    ]);

    if (userResult.status === "fulfilled") {
      setData((previous) => ({
        ...previous,
        user: isRecord(userResult.value) ? userResult.value : null,
      }));
    } else {
      setPageError(
        "Could not load your profile. Please refresh the page.",
      );
    }

    if (bookingResult.status === "fulfilled") {
      setData((previous) => ({
        ...previous,
        bookings: asRecordArray(bookingResult.value),
      }));
    } else {
      setBookingError("Bookings could not be loaded right now.");
    }

    if (notificationResult.status === "fulfilled") {
      setData((previous) => ({
        ...previous,
        notifications: asRecordArray(notificationResult.value),
      }));
    } else {
      setNotificationError("Notifications could not be loaded.");
    }

    if (serviceResult.status === "fulfilled") {
      setData((previous) => ({
        ...previous,
        services: asRecordArray(serviceResult.value),
      }));
    }

    setLoading(false);
  }, []);

  // Schedule the initial load outside the synchronous effect body.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDashboard]);

  // Capture the current time after mounting, not during rendering.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const authRecord = isRecord(authUser) ? authUser : null;
  const user = data.user ?? authRecord;

  const name =
    fieldText(user, "full_name") ||
    fieldText(user, "name") ||
    "Customer";

  const profileImage = fieldText(user, "profile_image_url");
  const userEmail = fieldText(user, "email") || undefined;

  const sortedBookings = [...data.bookings].sort(
    (a, b) => bookingTime(b) - bookingTime(a),
  );

  const upcomingBookings = sortedBookings
    .filter(
      (booking) =>
        !isFinished(booking) &&
        (currentTime === null || bookingTime(booking) >= currentTime),
    )
    .sort((a, b) => bookingTime(a) - bookingTime(b));

  const recentBookings = sortedBookings.slice(0, 5);

  const profileImageUrl =
    profileImage && profileImage.startsWith("http")
      ? profileImage
      : profileImage
        ? `${process.env.NEXT_PUBLIC_API_URL ?? ""}${profileImage}`
        : "";

  return (
    <DashboardLayout
      sidebarItems={NAV_ITEMS}
      activeHref="/customer/dashboard"
      title="Customer Dashboard"
      description="Manage your account and appointments"
      userName={name}
      userEmail={userEmail}
      notificationCount={data.notifications.length}
    >
      <div className="space-y-6">
        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {pageError}
            <button
              onClick={() => void loadDashboard()}
              className="ml-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Welcome Section */}
        <section className="blue-surface overflow-hidden rounded-card p-6 shadow-md sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-text-on-blue/80">
                Customer Dashboard
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-on-blue">
                Welcome, {name}!
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-on-blue/90">
                Find services, manage your appointments, and keep your
                account up to date.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/services?view=dashboard"
                  className="btn-outline rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-brand shadow-sm transition hover:bg-brand-soft"
                >
                  Explore Services
                </Link>

                <Link
                  href="/bookings"
                  className="rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-text-on-blue transition hover:bg-white/20"
                >
                  My Bookings
                </Link>

                <Link
                  href="/providers?view=dashboard"
                  className="rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-text-on-blue transition hover:bg-white/20"
                >
                  Explore Providers
                </Link>
              </div>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/60 bg-white/15 text-2xl font-bold text-text-on-blue shadow-inner">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </section>

        {/* Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Upcoming Bookings",
              value: loading ? "—" : upcomingBookings.length,
              note: "Appointments ahead",
            },
            {
              title: "Recent Bookings",
              value: loading ? "—" : data.bookings.length,
              note: "Bookings returned by the API",
            },
            {
              title: "Unread Notifications",
              value: loading ? "—" : data.notifications.length,
              note: "Updates for your account",
            },
            {
              title: "Available Services",
              value: loading ? "—" : data.services.length,
              note: "Services returned by search",
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-gray-500">{stat.note}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Appointments & Recent Bookings */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title="Upcoming Appointments"
            action={
              <Link
                href="/bookings"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                View all
              </Link>
            }
          >
            {loading ? (
              <p className="py-6 text-sm text-gray-500">
                Loading appointments…
              </p>
            ) : bookingError ? (
              <div className="space-y-3 text-sm text-red-600">
                <p>{bookingError}</p>
                <button
                  onClick={() => void loadDashboard()}
                  className="font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-8 text-center">
                <p className="font-medium text-gray-800">
                  No upcoming appointments
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Browse services to plan your next appointment.
                </p>
                <Link
                  href="/services?view=dashboard"
                  className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
                >
                  Find a service
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 4).map((booking, index) => (
                  <div
                    key={fieldText(booking, "id") || index}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {fieldText(booking, "service_name", "Service appointment")}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Provider: {fieldText(booking, "provider_name", "Not specified")}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {dateLabel(bookingDateValue(booking))}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {statusLabel(booking.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Recent Bookings"
            action={
              <Link
                href="/bookings"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                Booking history
              </Link>
            }
          >
            {loading ? (
              <p className="py-6 text-sm text-gray-500">
                Loading booking history…
              </p>
            ) : bookingError ? (
              <p className="py-6 text-sm text-red-600">{bookingError}</p>
            ) : recentBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Your bookings will appear here when you book a service.
              </p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking, index) => {
                  const statusUpper = fieldText(booking, "status").toUpperCase();
                  const isCompleted = statusUpper.includes("COMPLETED");
                  const bookingId = fieldText(booking, "id");

                  return (
                    <div
                      key={bookingId || index}
                      className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {fieldText(booking, "service_name", "Service appointment")}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {dateLabel(bookingDateValue(booking))}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                          {statusLabel(booking.status)}
                        </span>

                        {isCompleted && bookingId && (
                          <Link
                            href={`/booking?review_booking_id=${encodeURIComponent(
                              bookingId,
                            )}`}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-blue-100"
                          >
                            Leave Review
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Notifications & Quick Actions */}
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title="Notifications"
            action={
              <Link
                href="/notifications"
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                View all
              </Link>
            }
          >
            {loading ? (
              <p className="py-5 text-sm text-gray-500">
                Loading notifications…
              </p>
            ) : notificationError ? (
              <p className="py-5 text-sm text-red-600">
                {notificationError}
              </p>
            ) : data.notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                You are all caught up. No unread notifications.
              </p>
            ) : (
              <div className="space-y-3">
                {data.notifications.slice(0, 4).map((notification, index) => (
                  <div
                    key={fieldText(notification, "id") || index}
                    className="rounded-xl bg-gray-50 p-3"
                  >
                    <p className="font-medium text-gray-900">
                      {fieldText(notification, "title", "Account update")}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {fieldText(
                        notification,
                        "message",
                        "You have a new notification.",
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  href: "/services?view=dashboard",
                  title: "Explore Services",
                  description: "Find the right service for you",
                },
                {
                  href: "/providers?view=dashboard",
                  title: "Explore Providers",
                  description: "View provider profiles and services",
                },
                {
                  href: "/bookings",
                  title: "My Bookings",
                  description: "View or manage appointments",
                },
                {
                  href: "/customer/profile",
                  title: "Edit Profile",
                  description: "Update personal information",
                },
                {
                  href: "/notifications",
                  title: "Notifications",
                  description: "Check important updates",
                },
              ].map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="font-semibold text-gray-900">
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
