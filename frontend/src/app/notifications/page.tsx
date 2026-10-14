"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiClient } from "@/utils/api_client";
import LoadingState from "@/components/ui/LoadingState";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Check, Trash2, CheckCheck, ArrowLeft } from "lucide-react";

function NotificationsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.get<any[]>("/api/notifications");
      setNotifications(res ?? []);
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  // Determine dashboard route based on user role
  const dashboardHref =
    user?.role === "PROVIDER" ? "/provider/dashboard" : "/customer/dashboard";

  return (
    <div className="min-h-screen bg-surface-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Back Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline transition-colors"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </Link>

          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        </div>

        <div className="rounded-3xl bg-surface p-6 sm:p-8 shadow-[0_12px_40px_rgba(8,45,110,0.06)]">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted">
            View, read, and manage your activity alerts and updates.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <LoadingState message="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-sm text-muted">You have no notifications.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-5 flex items-start justify-between gap-4 transition-all ${
                  n.is_read
                    ? "bg-surface opacity-80"
                    : "bg-surface border-l-4 border-l-brand shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{n.title}</p>
                    {!n.is_read && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-1">{n.message}</p>
                  <span className="text-xs text-muted/70 mt-2 block">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="rounded-lg border border-line p-2 text-muted hover:bg-surface-blue hover:text-foreground transition-colors"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="rounded-lg border border-line p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}