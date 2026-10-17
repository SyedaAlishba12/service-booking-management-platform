"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  discoveryApi,
  type AvailableSlot,
  type DiscoveryService,
  type DiscoveryServiceType,
} from "@/api/discovery_api";
import { useAuth } from "@/app/providers/AuthProvider";
import { useDebounce } from "@/hooks/useDebounce";
import type { Category } from "@/types/category";
import { apiClient } from "@/utils/api_client";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface ProviderRating {
  provider_id: string;
  average_rating: number;
  total_reviews: number;
}

type SortOption =
  | "relevance"
  | "price_low"
  | "price_high"
  | "rating"
  | "reviews";

const PAGE_SIZE = 12;

const CUSTOMER_NAV_ITEMS = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Book a Service", href: "/booking" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Services", href: "/services?view=dashboard" },
  { label: "Providers", href: "/providers?view=dashboard" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/customer/profile" },
];

function formatPrice(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return `PKR ${value}`;

  return `PKR ${amount.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function getServiceLocation(service: DiscoveryService): string {
  return (
    service.location ||
    service.provider?.city ||
    service.provider?.location ||
    "Location not provided"
  );
}

function getSlotTime(slot: AvailableSlot): string {
  // Keep the wall-clock time from the timestamp returned by the API.
  const match = slot.start_at.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? "";
}

function formatTime(time: string): string {
  const [hoursText, minutes] = time.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isDashboardView = searchParams.get("view") === "dashboard";

  const { loading: authLoading, isAuthenticated } = useAuth();

  const [search, setSearch] = useState(
    () => searchParams.get("search") ?? searchParams.get("q") ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    () => searchParams.get("category_id") ?? "",
  );
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [date, setDate] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search.trim(), 350);

  function resetPage() {
    setPage(1);
  }

  function navigateToBooking(bookingPath: string) {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
      return;
    }

    router.push(bookingPath);
  }

  const categoriesQuery = useQuery({
    queryKey: ["discovery-categories"],
    queryFn: () => discoveryApi.listCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(
    () =>
      (categoriesQuery.data ?? [])
        .filter((category: Category) => category.is_active)
        .sort((a, b) => a.display_order - b.display_order),
    [categoriesQuery.data],
  );

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const normalizedServiceType = serviceType
    ? (serviceType as DiscoveryServiceType)
    : undefined;

  const servicesQuery = useQuery({
    queryKey: [
      "discovery-services",
      {
        q: debouncedSearch,
        category_id: categoryId,
        location: location.trim(),
        min_price: minPrice,
        max_price: maxPrice,
        service_type: normalizedServiceType,
        page,
        page_size: PAGE_SIZE,
      },
    ],
    queryFn: () =>
      discoveryApi.listServices({
        q: debouncedSearch || undefined,
        category_id: categoryId || undefined,
        location: location.trim() || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        service_type: normalizedServiceType,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const services = useMemo(
    () =>
      (servicesQuery.data?.items ?? []).filter(
        (service) => service.is_active,
      ),
    [servicesQuery.data],
  );

  const providerIds = useMemo(
    () => [...new Set(services.map((service) => service.provider_id))].sort(),
    [services],
  );

  const ratingsQuery = useQuery({
    queryKey: ["discovery-provider-ratings", providerIds],
    enabled: providerIds.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        providerIds.map((providerId) =>
          apiClient.get<ProviderRating>(
            `/api/providers/${providerId}/rating`,
          ),
        ),
      );

      const ratings: Record<string, ProviderRating> = {};

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          ratings[providerIds[index]] = result.value;
        }
      });

      return ratings;
    },
    staleTime: 60 * 1000,
  });

  const ratings = useMemo(
    () => ratingsQuery.data ?? {},
    [ratingsQuery.data],
  );

  // The central booking service remains the source of truth for free slots.
  const availabilityQuery = useQuery({
    queryKey: [
      "discovery-availability",
      date,
      services.map((service) => service.id).sort(),
    ],
    enabled: Boolean(date) && services.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        services.map(async (service) => {
          const slots = await discoveryApi.getAvailableSlots(
            service.provider_id,
            service.id,
            date,
          );

          return [service.id, slots] as const;
        }),
      );

      return Object.fromEntries(results) as Record<
        string,
        AvailableSlot[]
      >;
    },
    staleTime: 30 * 1000,
    retry: 1,
  });

  const availability = useMemo(
    () => availabilityQuery.data ?? {},
    [availabilityQuery.data],
  );

  const availableTimes = useMemo(() => {
    if (!date || availabilityQuery.isError) return [];

    const times = new Set<string>();

    Object.values(availability).forEach((slots) => {
      slots.forEach((slot) => {
        const time = getSlotTime(slot);
        if (time) times.add(time);
      });
    });

    return [...times].sort();
  }, [availability, availabilityQuery.isError, date]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const rating = ratings[service.provider_id];

      if (minRating !== "") {
        if (
          rating === undefined ||
          Number(rating.average_rating) < Number(minRating)
        ) {
          return false;
        }
      }

      if (date) {
        // Fail closed: do not present services as available until verified.
        if (availabilityQuery.isPending || availabilityQuery.isError) {
          return false;
        }

        const slots = availability[service.id] ?? [];

        if (slots.length === 0) return false;

        if (
          availableTime &&
          !slots.some((slot) => getSlotTime(slot) === availableTime)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    services,
    ratings,
    minRating,
    date,
    availableTime,
    availability,
    availabilityQuery.isPending,
    availabilityQuery.isError,
  ]);

  const sortedServices = useMemo(() => {
    const sorted = [...filteredServices];

    switch (sort) {
      case "price_low":
        return sorted.sort((a, b) => Number(a.price) - Number(b.price));

      case "price_high":
        return sorted.sort((a, b) => Number(b.price) - Number(a.price));

      case "rating":
        return sorted.sort(
          (a, b) =>
            (ratings[b.provider_id]?.average_rating ?? 0) -
            (ratings[a.provider_id]?.average_rating ?? 0),
        );

      case "reviews":
        return sorted.sort(
          (a, b) =>
            (ratings[b.provider_id]?.total_reviews ?? 0) -
            (ratings[a.provider_id]?.total_reviews ?? 0),
        );

      default:
        return sorted;
    }
  }, [filteredServices, ratings, sort]);

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setServiceType("");
    setDate("");
    setAvailableTime("");
    setSort("relevance");
    setPage(1);

    // Keep the customer dashboard view when clearing filters.
    router.replace(
      isDashboardView ? "/services?view=dashboard" : "/services",
    );
  }

  const totalPages = servicesQuery.data?.meta.total_pages ?? 1;
  const totalServices = servicesQuery.data?.meta.total ?? 0;
  const isLoading = servicesQuery.isPending;
  const serviceError = servicesQuery.isError;

  const isCheckingAvailability =
    Boolean(date) && services.length > 0 && availabilityQuery.isPending;

  const availabilityError =
    Boolean(date) && services.length > 0 && availabilityQuery.isError;

  const pageContent = (
    <div className="w-full space-y-8">
      {/* Page introduction */}
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
          {isDashboardView ? "Customer workspace" : "Explore our services"}
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Find the right service for you
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Explore services, compare prices and provider ratings, and find a
          professional with an appointment that suits you.
        </p>
      </section>

      {/* Search and filters */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold">Search and filters</h2>
          <p className="mt-1 text-sm text-muted">
            Narrow down services by category, price, rating, location, and
            appointment availability.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label
              htmlFor="service-search"
              className="mb-2 block text-sm font-semibold"
            >
              Search services or providers
            </label>
            <input
              id="service-search"
              value={search}
              onChange={(event) => {
                resetPage();
                setSearch(event.target.value);
              }}
              placeholder="e.g. haircut, cleaning, provider..."
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none transition focus:border-brand"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-semibold"
            >
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(event) => {
                resetPage();
                setCategoryId(event.target.value);
              }}
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-2 block text-sm font-semibold"
            >
              Location
            </label>
            <input
              id="location"
              value={location}
              onChange={(event) => {
                resetPage();
                setLocation(event.target.value);
              }}
              placeholder="City or area"
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label
              htmlFor="min-price"
              className="mb-2 block text-sm font-semibold"
            >
              Minimum price (PKR)
            </label>
            <input
              id="min-price"
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => {
                resetPage();
                setMinPrice(event.target.value);
              }}
              placeholder="e.g. 1000"
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label
              htmlFor="max-price"
              className="mb-2 block text-sm font-semibold"
            >
              Maximum price (PKR)
            </label>
            <input
              id="max-price"
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => {
                resetPage();
                setMaxPrice(event.target.value);
              }}
              placeholder="e.g. 5000"
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label
              htmlFor="rating"
              className="mb-2 block text-sm font-semibold"
            >
              Minimum provider rating
            </label>
            <select
              id="rating"
              value={minRating}
              onChange={(event) => {
                resetPage();
                setMinRating(event.target.value);
              }}
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            >
              <option value="">Any rating</option>
              <option value="4">4.0 and above</option>
              <option value="4.5">4.5 and above</option>
              <option value="4.8">4.8 and above</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="service-type"
              className="mb-2 block text-sm font-semibold"
            >
              Service type
            </label>
            <select
              id="service-type"
              value={serviceType}
              onChange={(event) => {
                resetPage();
                setServiceType(event.target.value);
              }}
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            >
              <option value="">All service types</option>
              <option value="ON_SITE">On Site</option>
              <option value="AT_PROVIDER">At Provider</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="available-date"
              className="mb-2 block text-sm font-semibold"
            >
              Available date
            </label>
            <input
              id="available-date"
              type="date"
              min={getLocalDateString()}
              value={date}
              onChange={(event) => {
                resetPage();
                setDate(event.target.value);
                setAvailableTime("");
              }}
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label
              htmlFor="available-time"
              className="mb-2 block text-sm font-semibold"
            >
              Available time
            </label>
            <select
              id="available-time"
              value={availableTime}
              disabled={
                !date || isCheckingAvailability || availabilityError
              }
              onChange={(event) => {
                resetPage();
                setAvailableTime(event.target.value);
              }}
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {!date
                  ? "Select a date first"
                  : isCheckingAvailability
                    ? "Checking available times..."
                    : availabilityError
                      ? "Availability unavailable"
                      : "Any available time"}
              </option>
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {formatTime(time)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            {categoriesQuery.isError && (
              <p className="text-sm text-muted" role="status">
                Categories are temporarily unavailable. You can still browse
                services.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold transition hover:bg-background"
          >
            Clear filters
          </button>
        </div>
      </section>

      {/* Service results */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Available services</h2>
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {isLoading
                ? "Loading services..."
                : date && isCheckingAvailability
                  ? "Checking real appointment availability..."
                  : date && availabilityError
                    ? "Availability could not be verified."
                    : `${totalServices} service${totalServices === 1 ? "" : "s"} match your service filters`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="sort" className="text-sm font-semibold">
              Sort by
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortOption)
              }
              className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="relevance">Default</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-sm text-muted" role="status">
              Fetching services from the server...
            </p>
          </div>
        )}

        {serviceError && (
          <div className="rounded-2xl border border-line bg-surface p-8">
            <h3 className="font-bold">Services could not be loaded</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              The services API is currently unavailable. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void servicesQuery.refetch()}
              className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {availabilityError && (
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm" role="alert">
              Appointment availability could not be checked. Please try again.
              Services are not being marked available without a successful slot
              check.
            </p>
            <button
              type="button"
              onClick={() => void availabilityQuery.refetch()}
              className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold"
            >
              Check again
            </button>
          </div>
        )}

        {!isLoading &&
          !serviceError &&
          !isCheckingAvailability &&
          !availabilityError &&
          sortedServices.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
              <h3 className="text-lg font-bold">No services found</h3>
              <p className="mt-2 text-sm text-muted">
                Try changing your search or filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
              >
                Clear filters
              </button>
            </div>
          )}

        {!isLoading &&
          !serviceError &&
          !isCheckingAvailability &&
          !availabilityError &&
          sortedServices.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedServices.map((service) => {
                const provider = service.provider;
                const rating = ratings[service.provider_id];
                const categoryName = categoryNames.get(service.category_id);
                const slots = availability[service.id] ?? [];

                return (
                  <article
                    key={service.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-36 items-center justify-center bg-background">
                      {provider?.profile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={provider.profile_image_url}
                          alt={`${provider.business_name} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-brand">
                          {service.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      {categoryName && (
                        <p className="text-xs font-bold uppercase tracking-wide text-brand">
                          {categoryName}
                        </p>
                      )}

                      <h3 className="mt-1 text-lg font-bold">
                        {service.name}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
                        {service.description ||
                          "Contact the provider for details."}
                      </p>

                      <p className="mt-4 text-sm">
                        <span className="text-muted">Provider: </span>
                        {provider ? (
                          <Link
                            href={
                              isDashboardView
                                ? `/providers/${provider.id}?view=dashboard`
                                : `/providers/${provider.id}`
                            }
                            className="font-semibold text-brand hover:underline"
                          >
                            {provider.business_name}
                          </Link>
                        ) : (
                          <span className="text-muted">
                            Provider details unavailable
                          </span>
                        )}
                      </p>

                      <p className="mt-2 text-sm text-muted">
                        {getServiceLocation(service)}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-line px-2.5 py-1">
                          {service.service_type.replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full border border-line px-2.5 py-1">
                          {service.duration_minutes} minutes
                        </span>
                        {rating && (
                          <span className="rounded-full border border-line px-2.5 py-1">
                            ★ {Number(rating.average_rating).toFixed(1)} (
                            {rating.total_reviews}{" "}
                            {rating.total_reviews === 1 ? "review" : "reviews"})
                          </span>
                        )}
                      </div>

                      {date && (
                        <p className="mt-3 text-xs text-muted">
                          {slots.length} slot
                          {slots.length === 1 ? "" : "s"} available on {date}
                          {availableTime
                            ? ` at ${formatTime(availableTime)}`
                            : ""}
                        </p>
                      )}

                      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
                        <div>
                          <span className="text-xs text-muted">Price</span>
                          <p className="text-lg font-bold">
                            {formatPrice(service.price)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigateToBooking(
                              `/booking?provider_id=${encodeURIComponent(
                                service.provider_id,
                              )}&service_id=${encodeURIComponent(service.id)}`,
                            )
                          }
                          disabled={authLoading}
                          className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                        >
                          Book now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        {!isLoading && !serviceError && !date && (
          <p className="text-xs leading-5 text-muted">
            Weekly schedules do not guarantee that a specific appointment slot
            is free. Select a date to check actual availability before booking.
          </p>
        )}

        {!isLoading && !serviceError && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1 || servicesQuery.isFetching}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || servicesQuery.isFetching}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );

  // Public /services stays public and does not display the customer sidebar.
  if (!isDashboardView) {
    return pageContent;
  }

  return (
    <DashboardLayout
      sidebarItems={CUSTOMER_NAV_ITEMS}
      activeHref="/services?view=dashboard"
      title="Services"
      description="Explore services, compare prices, and find an appointment."
    >
      {pageContent}
    </DashboardLayout>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6">
          <p className="text-sm text-muted" role="status">
            Loading services...
          </p>
        </div>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}