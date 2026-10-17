"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { apiClient } from "@/utils/api_client";
import { Bell, Check } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function refreshNotifications() {
      try {
        const result =
          await apiClient.get<NotificationItem[]>("/api/notifications");

        if (!active) return;

        const items = Array.isArray(result) ? result : [];
        setNotifications(items);
        setUnreadCount(items.filter((item) => !item.is_read).length);
      } catch (error) {
        if (active) {
          console.error("Failed to load notifications", error);
        }
      }
    }

    void refreshNotifications();
    const interval = window.setInterval(
      () => void refreshNotifications(),
      30000
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function markAsRead(id: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    const notification = notifications.find((item) => item.id === id);
    if (!notification || notification.is_read) return;

    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3.5 transition-colors ${
                    item.is_read ? "bg-white opacity-75" : "bg-blue-50/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                      {item.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-gray-400">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={(event) => void markAsRead(item.id, event)}
                      className="shrink-0 rounded-lg p-1 text-brand transition-colors hover:bg-blue-100"
                      title="Mark as read"
                      aria-label="Mark notification as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50 p-3 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-gray-700 hover:text-brand"
            >
              Open Full Notification Page →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}