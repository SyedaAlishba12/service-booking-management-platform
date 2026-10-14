"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardHeader from "@/components/layout/DashboardHeader";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiClient } from "@/utils/api_client";
import LoadingState from "@/components/ui/LoadingState";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const customerSidebarItems = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Bookings", href: "/bookings" },
  { label: "Calendar", href: "/calendar" },
  { label: "Services", href: "/services" },
  { label: "Providers", href: "/providers" },
  { label: "Reviews", href: "/reviews" },
  { label: "Settings", href: "/profile" },
];

function CustomerDashboardContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        // Consuming Sayeel's Booking APIs and Zainab's Notification APIs[cite: 7]
        const [bookingsRes, notificationsRes] = await Promise.all([
          apiClient.get<any[]>("/api/bookings").catch(() => []),
          apiClient.get<any[]>("/api/notifications/unread").catch(() => []),
        ]);

        setBookings(bookingsRes ?? []);
        setNotifications(notificationsRes ?? []);
      } catch (err) {
        setError("Unable to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();
  }, []);

  const upcomingBookings = bookings.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED"
  );

  const completedBookings = bookings.filter(
    (b) => b.status === "COMPLETED"
  );

  const unreadNotificationCount = notifications.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-blue">
        <Sidebar
          items={customerSidebarItems}
          activeHref="/customer/dashboard"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="lg:pl-[232px] flex min-h-screen items-center justify-center">
          <LoadingState message="Loading your dashboard..." minHeight="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-blue">
      <Sidebar
        items={customerSidebarItems}
        activeHref="/customer/dashboard"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-[232px]">
        <DashboardHeader
          userName={user?.full_name}
          userEmail={user?.email}
          notificationCount={unreadNotificationCount}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px] space-y-7">
            {error && <Alert variant="error">{error}</Alert>}

            {/* ================= WELCOME SECTION ================= */}
            <div className="rounded-3xl bg-surface p-6 sm:p-8 shadow-[0_12px_40px_rgba(8,45,110,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                    Welcome back, {user?.full_name ?? "Customer"}!
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    Here is your appointment summary, recent activity, and quick access to services.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center rounded-xl bg-sidebar px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-sidebar-hover"
                  >
                    + Book new service
                  </Link>
                </div>
              </div>
            </div>

            {/* ================= STATS / SUMMARY GRID ================= */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Upcoming Bookings
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {upcomingBookings.length}
                </p>
                <p className="mt-1 text-xs text-muted">Scheduled appointments</p>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Completed Bookings
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {completedBookings.length}
                </p>
                <p className="mt-1 text-xs text-muted">Services received</p>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Total Bookings
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {bookings.length}
                </p>
                <p className="mt-1 text-xs text-muted">Lifetime appointments</p>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Unread Notifications
                </p>
                <p className="mt-2 text-3xl font-bold text-brand">
                  {unreadNotificationCount}
                </p>
                <p className="mt-1 text-xs text-muted">Recent alerts</p>
              </Card>
            </div>

            {/* ================= UPCOMING APPOINTMENTS ================= */}
            <div className="rounded-3xl bg-surface p-6 sm:p-8 shadow-[0_12px_40px_rgba(8,45,110,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  Upcoming Appointments
                </h2>
                <Link
                  href="/bookings"
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  View history →
                </Link>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted">No upcoming appointments found.</p>
                  <Link
                    href="/services"
                    className="mt-3 inline-block rounded-xl bg-brand-soft px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
                  >
                    Browse & book services
                  </Link>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-line">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {booking.service_name ?? "Service Booking"}
                        </p>
                        <p className="text-xs text-muted">
                          Provider: {booking.provider_name ?? "Professional"} · {booking.date} at {booking.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {booking.status}
                        </span>
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface-blue"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ================= QUICK ACTIONS & PROFILE ACCESS ================= */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
                <p className="mt-1 text-sm text-muted">Jump straight into common tasks.</p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Link
                    href="/services"
                    className="flex flex-col rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand hover:shadow-md"
                  >
                    <span className="font-semibold text-foreground">Find a Service</span>
                    <span className="mt-1 text-xs text-muted">Explore categories & book slots</span>
                  </Link>

                  <Link
                    href="/providers"
                    className="flex flex-col rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand hover:shadow-md"
                  >
                    <span className="font-semibold text-foreground">Browse Providers</span>
                    <span className="mt-1 text-xs text-muted">View trusted professionals</span>
                  </Link>

                  <Link
                    href="/profile"
                    className="flex flex-col rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand hover:shadow-md"
                  >
                    <span className="font-semibold text-foreground">Account Settings</span>
                    <span className="mt-1 text-xs text-muted">Update profile & photo</span>
                  </Link>
                </div>
              </Card>

              {/* Profile Summary Card */}
              <Card className="p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">My Profile</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar text-lg font-bold text-white overflow-hidden">
                      {user?.profile_image_url ? (
                        <img
                          src={
                            user.profile_image_url.startsWith("http")
                              ? user.profile_image_url
                              : `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")}${user.profile_image_url}`
                          }
                          alt={user.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user?.full_name?.charAt(0).toUpperCase() ?? "U"
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{user?.full_name}</p>
                      <p className="text-xs text-muted">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/profile"
                    className="block w-full text-center rounded-xl bg-brand-soft py-2.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
                  >
                    Edit Profile
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <ProtectedRoute>
      <CustomerDashboardContent />
    </ProtectedRoute>
  );
}