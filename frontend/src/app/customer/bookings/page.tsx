"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { useAuth } from "@/app/providers/AuthProvider";
import { useState, useEffect } from "react";
import { apiClient } from "@/utils/api_client";
import LoadingState from "@/components/ui/LoadingState";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const customerSidebarItems = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Bookings", href: "/customer/bookings" },
  { label: "Calendar", href: "/customer/calendar" },
  { label: "Services", href: "/services" },
  { label: "Providers", href: "/providers" },
  { label: "Reviews", href: "/customer/reviews" },
  { label: "Settings", href: "/profile" },
];

function CustomerBookingsContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await apiClient.get<any[]>("/api/bookings");
        setBookings(res ?? []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchBookings();
  }, []);

  return (
    <div className="min-h-screen bg-surface-blue">
      <Sidebar
        items={customerSidebarItems}
        activeHref="/customer/bookings"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-[232px]">
        <DashboardHeader
          userName={user?.full_name}
          userEmail={user?.email}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px] space-y-6">
            <div className="rounded-3xl bg-surface p-6 sm:p-8 shadow-[0_12px_40px_rgba(8,45,110,0.06)]">
              <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
              <p className="mt-1 text-sm text-muted">View and manage all your past and upcoming service bookings[cite: 1, 2, 7].</p>
            </div>

            {loading ? (
              <LoadingState message="Loading bookings..." />
            ) : bookings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted">No bookings found.</p>
                <Link href="/services" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
                  Book a service now →
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <Card key={b.id} className="p-5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{b.service_name ?? "Service"}</p>
                      <p className="text-xs text-muted">Date: {b.date} at {b.time} · Status: {b.status}</p>
                    </div>
                    <Link href={`/bookings/${b.id}`} className="rounded-xl bg-brand-soft px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
                      Details
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CustomerBookingsPage() {
  return (
    <ProtectedRoute>
      <CustomerBookingsContent />
    </ProtectedRoute>
  );
}