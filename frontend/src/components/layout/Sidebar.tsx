
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

type IconType =
  | "dashboard"
  | "calendar"
  | "booking"
  | "service"
  | "provider"
  | "review"
  | "category"
  | "settings";

function Icon({ type }: { type: IconType }) {
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

  switch (type) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "booking":
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case "service":
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="8.5" />
        </svg>
      );

    case "provider":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
        </svg>
      );

    case "review":
      return (
        <svg {...common}>
          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      );

    case "category":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.3v-2.6h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2H15v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
  }
}

const iconMap: Record<string, IconType> = {
  Dashboard: "dashboard",
  "Admin overview": "dashboard",
  Calendar: "calendar",
  Bookings: "booking",
  "Booking management": "booking",
  Services: "service",
  "Service management": "service",
  Providers: "provider",
  "Provider approvals": "provider",
  "User management": "provider",
  Users: "provider",
  Reviews: "review",
  Complaints: "review",
  Reports: "booking",
  Categories: "category",
  Settings: "settings",
  "Book a Service": "service",
  "My Bookings": "booking",
  Earnings: "booking",
  Customers: "provider",
};

const adminSections = [
  {
    title: "OVERVIEW",
    labels: ["Admin overview"],
  },
  {
    title: "OPERATIONS",
    labels: [
      "Provider approvals",
      "Service management",
      "Booking management",
    ],
  },
  {
    title: "PEOPLE & TRUST",
    labels: ["User management", "Reviews", "Complaints"],
  },
  {
    title: "INSIGHTS & SETTINGS",
    labels: ["Reports", "Categories", "Settings"],
  },
];

export default function Sidebar({
  items,
  activeHref,
  isOpen,
  onClose,
}: SidebarProps) {
  const { user, loading } = useAuth();

  const isAdmin =
    user?.role?.toLowerCase() === "admin" ||
    items.some((item) => item.href === "/dashboard/admin");

  const settingsItem = items.find((item) => item.label === "Settings");

  const workspaceLabels = new Set([
    "Dashboard",
    "Calendar",
    "Bookings",
    "Book a Service",
    "My Bookings",
    "Earnings",
    "Customers",
    "Services",
    "Providers",
  ]);

  const workspaceItems = items.filter((item) =>
    workspaceLabels.has(item.label)
  );

 const manageItems = items.filter(
  (item) =>
    !workspaceLabels.has(item.label) &&
    item.label !== "Settings" &&
    item.label !== "Categories"
);

  const renderItem = (item: SidebarItem) => {
    const active = item.href === activeHref;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
       className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-all duration-200 ${
          active
            ? "bg-sidebar text-white shadow-sm"
            : "text-foreground/75 hover:bg-brand-soft hover:text-brand"
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
            active ? "text-white" : "text-muted group-hover:text-brand"
          }`}
        >
          {item.icon ?? (
            <Icon type={iconMap[item.label] ?? "dashboard"} />
          )}
        </span>

        <span className="min-w-0 flex-1 leading-5">{item.label}</span>

        {active && (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-white"
          />
        )}
      </Link>
    );
  };

  const displayName = user?.full_name ?? "User";
  const displayRole = user?.role ?? "Customer";
  const userInitial = displayName.charAt(0).toUpperCase();

  const profileImageUrl = user?.profile_image_url
    ? user.profile_image_url.startsWith("http")
      ? user.profile_image_url
      : `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")}${user.profile_image_url}`
    : null;

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-4 left-4 top-4 z-50 flex w-[248px] flex-col overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_12px_40px_rgba(8,45,110,0.10)] transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        {/* Brand */}
        <div className="px-5 pb-5 pt-6">
          <Link
            href={isAdmin ? "/dashboard/admin" : "/dashboard"}
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar text-lg font-bold text-white shadow-sm">
              S
            </span>

            <span className="min-w-0">
              <span className="block text-lg font-bold tracking-tight text-foreground">
                ServiceHub
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {isAdmin ? "Admin Console" : "Workspace"}
              </span>
            </span>
          </Link>
        </div>

        <div className="mx-4 border-t border-line" />

        {/* Navigation */}
        <nav
          aria-label="Dashboard navigation"
          className="flex-1 space-y-5 overflow-y-auto px-3 py-5"
        >
          {isAdmin ? (
            adminSections.map((section) => {
              const sectionItems = section.labels
                .map((label) =>
                  items.find((item) => item.label === label)
                )
                .filter(
                  (item): item is SidebarItem => item !== undefined
                );

              if (sectionItems.length === 0) return null;

              return (
                <section key={section.title}>
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted/90">
                    {section.title}
                  </p>

                  <div className="space-y-1">
                    {sectionItems.map(renderItem)}
                  </div>
                </section>
              );
            })
          ) : (
            <>
              {workspaceItems.length > 0 && (
                <section>
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted/90">
                    Workspace
                  </p>
                  <div className="space-y-1">
                    {workspaceItems.map(renderItem)}
                  </div>
                </section>
              )}

              {manageItems.length > 0 && (
                <section>
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted/90">
                    Manage
                  </p>
                  <div className="space-y-1">
                    {manageItems.map(renderItem)}
                  </div>
                </section>
              )}
            </>
          )}
        </nav>

        {/* Bottom profile */}
        <div className="border-t border-line bg-gray-50/70 p-3">
          {!isAdmin && settingsItem && renderItem(settingsItem)}

          <div className="flex items-center gap-3 rounded-2xl px-2 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar text-sm font-semibold text-white ring-2 ring-white">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitial
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {loading ? "Loading..." : displayName}
              </p>
              <p className="mt-0.5 truncate text-xs capitalize text-muted">
                {loading ? "" : displayRole}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
