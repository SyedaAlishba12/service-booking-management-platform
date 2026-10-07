import type { ServiceType } from "@/types/provider";

export const CURRENCY = "PKR";

export const SERVICE_TYPE_OPTIONS: { label: string; value: ServiceType }[] = [
  { label: "On-site (provider visits customer)", value: "ON_SITE" },
  { label: "At provider's location", value: "AT_PROVIDER" },
  { label: "Online", value: "ONLINE" },
];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ON_SITE: "On-site",
  AT_PROVIDER: "At provider",
  ONLINE: "Online",
};

/**
 * Same items and links as the sidebar on /dashboard (Syeda's page), so navigation is
 * identical everywhere. Services and Providers open MY pages; the rest belong to others.
 * TODO: Syeda should export this list from one shared place so it is not copied.
 */
export const PROVIDER_SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/provider/dashboard" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Bookings", href: "/dashboard/bookings" },
  { label: "Services", href: "/dashboard/services" },
  { label: "Providers", href: "/dashboard/providers" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Categories", href: "/dashboard/categories" },
  { label: "Settings", href: "/dashboard/settings" },
];

export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
