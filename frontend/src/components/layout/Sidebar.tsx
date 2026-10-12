"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";

interface SidebarItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface SidebarProps {
  items: SidebarItem[];
  activeHref: string;
  isOpen: boolean;
  onClose: () => void;
}

function Icon({
  type,
}: {
  type:
    | "dashboard"
    | "calendar"
    | "booking"
    | "service"
    | "provider"
    | "review"
    | "category"
    | "settings";
}) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "dashboard") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if (type === "booking") {
    return (
      <svg {...common}>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (type === "service") {
    return (
      <svg {...common}>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    );
  }

  if (type === "provider") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
      </svg>
    );
  }

  if (type === "review") {
    return (
      <svg {...common}>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      </svg>
    );
  }

  if (type === "category") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3.5a2 2 0 0 1 4 0v.5a8.5 8.5 0 0 1 2.2 1.3l.4-.2a2 2 0 1 1 2 3.5l-.4.2c.1.5.2 1 .2 1.7s-.1 1.2-.2 1.7l.4.2a2 2 0 1 1-2 3.5l-.4-.2A8.5 8.5 0 0 1 16 17v.5a2 2 0 1 1-4 0V17a8.5 8.5 0 0 1-2.2-1.3l-.4.2a2 2 0 1 1-2-3.5l.4-.2a8.5 8.5 0 0 1-.2-1.7c0-.6.1-1.2.2-1.7l-.4-.2a2 2 0 1 1 2-3.5l.4.2A8.5 8.5 0 0 1 12 4v-.5Z" />
      <circle cx="14" cy="10.5" r="2.5" />
    </svg>
  );
}

const iconMap: Record<string, Parameters<typeof Icon>[0]["type"]> = {
  Dashboard: "dashboard",
  Calendar: "calendar",
  Bookings: "booking",
  Services: "service",
  Providers: "provider",
  Reviews: "review",
  Categories: "category",
  Settings: "settings",
};

export default function Sidebar({
  items,
  activeHref,
  isOpen,
  onClose,
}: SidebarProps) {
  const { user, loading } = useAuth();

  const workspaceLabels = [
    "Dashboard",
    "Calendar",
    "Bookings",
    "Services",
    "Providers",
  ];

  const manageLabels = ["Reviews", "Categories"];

  const workspaceItems = items.filter((item) =>
    workspaceLabels.includes(item.label)
  );

  const manageItems = items.filter((item) =>
    manageLabels.includes(item.label)
  );

  const settingsItem = items.find((item) => item.label === "Settings");

  const renderItem = (item: SidebarItem) => {
    const active = item.href === activeHref;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`flex h-11 items-center gap-3 rounded-xl px-4 text-base font-medium transition-colors ${
          active
            ? "bg-sidebar text-white shadow-sm"
            : "text-foreground/75 hover:bg-brand-soft hover:text-brand"
        }`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {item.icon ?? (
            <Icon type={iconMap[item.label] ?? "dashboard"} />
          )}
        </span>

        <span>{item.label}</span>
      </Link>
    );
  };

  const displayName = user?.full_name ?? "User";
  const displayRole = user?.role ?? "Customer";

  const userInitial = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : "U";

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* Floating panel */}
      <aside
        className={`fixed bottom-4 left-4 top-4 z-50 flex w-[232px] flex-col rounded-3xl bg-white shadow-[0_8px_30px_rgba(8,45,110,0.10)] transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        {/* Brand */}
        <div className="px-5 pb-3 pt-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar text-lg font-bold text-white">
              S
            </span>

            <span className="text-xl font-bold tracking-[-0.02em] text-foreground">
              ServiceHub
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div>
            <p className="mb-2 px-4 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
              Workspace
            </p>

            <div className="space-y-1">
              {workspaceItems.map(renderItem)}
            </div>
          </div>

          {manageItems.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 px-4 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
                Manage
              </p>

              <div className="space-y-1">
                {manageItems.map(renderItem)}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className="border-t border-line p-3">
          {settingsItem && renderItem(settingsItem)}

          <div className="mt-2 flex items-center gap-3 rounded-xl px-4 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar text-base font-semibold text-white">
              {user?.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitial
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-5 text-foreground">
                {loading ? "Loading..." : displayName}
              </p>

              <p className="truncate text-sm text-muted">
                {loading ? "" : displayRole}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}