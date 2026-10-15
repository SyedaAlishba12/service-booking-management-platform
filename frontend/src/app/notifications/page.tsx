"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiClient } from "@/utils/api_client";
import LoadingState from "@/components/ui/LoadingState";
import Alert from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Check, CheckCheck, Trash2 } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        const result =
          await apiClient.get<NotificationItem[]>("/api/notifications");

        if (!active) return;

        setNotifications(Array.isArray(result) ? result : []);
        setError("");
      } catch {
        if (active) setError("Unable to load notifications.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  async function markAsRead(id: string) {
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
    } catch {
      setError("Unable to mark the notification as read.");
    }
  }

  async function markAllAsRead() {
    try {
      await apiClient.put("/api/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
    } catch {
      setError("Unable to mark notifications as read.");
    }
  }

  async function deleteNotification(id: string) {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications((current) =>
        current.filter((item) => item.id !== id)
      );
    } catch {
      setError("Unable to delete the notification.");
    }
  }

  const dashboardHref =
    user?.role === "PROVIDER" ? "/provider/dashboard" : "/customer/dashboard";

  return (
    <div className="min-h-screen bg-surface-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:underline"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-4 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-[0_12px_40px_rgba(8,45,110,0.06)] sm:p-8">
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
            {notifications.map((item) => (
              <Card
                key={item.id}
                className={`flex items-start justify-between gap-4 p-5 transition-all ${
                  item.is_read
                    ? "bg-surface opacity-80"
                    : "border-l-4 border-l-brand bg-surface shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {item.title}
                    </p>
                    {!item.is_read && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.message}</p>
                  <span className="mt-2 block text-xs text-muted/70">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => void markAsRead(item.id)}
                      className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-surface-blue hover:text-foreground"
                      title="Mark as read"
                      aria-label="Mark notification as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void deleteNotification(item.id)}
                    className="rounded-lg border border-line p-2 text-red-500 transition-colors hover:bg-red-50"
                    title="Delete notification"
                    aria-label="Delete notification"
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