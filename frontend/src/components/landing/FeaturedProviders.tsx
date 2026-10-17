
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/utils/api_client";
import type { PaginatedData } from "@/types/api";
import type { DiscoveryService } from "@/api/discovery_api";

interface ProviderDiscoveryItem {
  id: string;
  business_name: string;
  description: string | null;
  location: string | null;
  city: string | null;
  profile_image_url: string | null;
}

interface ProviderRating {
  provider_id: string;
  average_rating: number;
  total_reviews: number;
  breakdown?: Record<string, number>;
}

interface WeeklyAvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

interface ProviderAvailabilityResponse {
  provider_id: string;
  timezone?: string;
  weekly: WeeklyAvailabilityRow[];
}

interface ProviderCardData extends ProviderDiscoveryItem {
  services: DiscoveryService[];
  rating: number | null;
  reviewCount: number;
  availabilitySummary: string | null;
}

function formatPrice(price: string | number): string {
  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return `PKR ${price}`;
  }

  return `PKR ${amount.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function getAvailabilitySummary(
  weekly: WeeklyAvailabilityRow[],
): string {
  const workingRows = weekly.filter((row) => !row.is_break);

  if (workingRows.length === 0) {
    return "Weekly hours not listed";
  }

  const days = new Set(workingRows.map((row) => row.day_of_week));

  return `Weekly hours listed · ${days.size} ${
    days.size === 1 ? "day" : "days"
  }`;
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="m10 1.8 2.53 5.13 5.66.82-4.1 4 .97 5.64L10 14.73l-5.06 2.66.97-5.64-4.1-4 5.66-.82L10 1.8Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 shrink-0"
    >
      <path
        d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function FeaturedProviders() {
  const [providers, setProviders] = useState<ProviderCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      setLoading(true);
      setError(false);

      try {
        const [providerData, serviceData] = await Promise.all([
          apiClient.get<PaginatedData<ProviderDiscoveryItem>>(
            "/api/providers?page=1&page_size=12",
          ),
          apiClient.get<PaginatedData<DiscoveryService>>(
            "/api/services?page=1&page_size=100",
          ),
        ]);

        if (cancelled) return;

        const activeServices = serviceData.items.filter(
          (service) => service.is_active,
        );

        const providerCards = await Promise.all(
          providerData.items.map(async (provider) => {
            const providerServices = activeServices.filter(
              (service) => service.provider_id === provider.id,
            );

            let rating: number | null = null;
            let reviewCount = 0;
            let availabilitySummary: string | null = null;

            const [ratingResult, availabilityResult] = await Promise.allSettled([
              apiClient.get<ProviderRating>(
                `/api/providers/${provider.id}/rating`,
              ),
              apiClient.get<ProviderAvailabilityResponse>(
                `/api/providers/${provider.id}/availability`,
              ),
            ]);

            if (ratingResult.status === "fulfilled") {
              rating = Number.isFinite(
                Number(ratingResult.value.average_rating),
              )
                ? Number(ratingResult.value.average_rating)
                : null;

              reviewCount = Number.isFinite(
                Number(ratingResult.value.total_reviews),
              )
                ? Number(ratingResult.value.total_reviews)
                : 0;
            }

            if (availabilityResult.status === "fulfilled") {
              availabilitySummary = getAvailabilitySummary(
                availabilityResult.value.weekly ?? [],
              );
            }

            return {
              ...provider,
              services: providerServices,
              rating,
              reviewCount,
              availabilitySummary,
            };
          }),
        );

        if (!cancelled) {
          setProviders(providerCards);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setProviders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="providers" className="section scroll-mt-20">
      <div className="container">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Meet the professionals
            </p>

            <h2 className="mt-2 text-2xl sm:text-3xl">
              Featured providers
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              Explore service providers, compare their services and prices,
              and check customer ratings before booking.
            </p>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
          >
            Browse services
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {loading && (
          <div
            role="status"
            className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-line bg-surface p-5"
              >
                <div className="h-16 w-16 rounded-2xl bg-line" />
                <div className="mt-5 h-4 w-2/3 rounded bg-line" />
                <div className="mt-3 h-3 w-full rounded bg-line" />
                <div className="mt-2 h-3 w-4/5 rounded bg-line" />
                <div className="mt-6 h-9 rounded-lg bg-line" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-7 rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-bold">Providers could not be loaded</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Please try again later. You can still browse the services page.
            </p>
            <Link
              href="/services"
              className="mt-4 inline-flex text-sm font-semibold text-brand hover:text-secondary"
            >
              Browse services →
            </Link>
          </div>
        )}

        {!loading && !error && providers.length === 0 && (
          <div className="mt-7 rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-bold">No providers to display yet</h3>
            <p className="mt-2 text-sm text-muted">
              Featured providers will appear here when provider records are available.
            </p>
          </div>
        )}

        {!loading && !error && providers.length > 0 && (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.slice(0, 6).map((provider) => {
              const lowestPrice = provider.services.reduce<number | null>(
                (lowest, service) => {
                  const price = Number(service.price);

                  if (!Number.isFinite(price)) return lowest;

                  return lowest === null || price < lowest ? price : lowest;
                },
                null,
              );

              const location =
                provider.city || provider.location || "Location not provided";

              return (
                <article
                  key={provider.id}
                  className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft text-xl font-bold text-brand">
                      {provider.profile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={provider.profile_image_url}
                          alt={`${provider.business_name} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        provider.business_name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-bold">
                        {provider.business_name}
                      </h3>

                      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                        <LocationIcon />
                        <span>{location}</span>
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {provider.rating !== null ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold">
                            <span className="text-amber-500">
                              <StarIcon />
                            </span>
                            {provider.rating.toFixed(1)}
                            <span className="font-normal text-muted">
                              ({provider.reviewCount}{" "}
                              {provider.reviewCount === 1 ? "review" : "reviews"})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted">
                            Rating unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted">
                    {provider.description ||
                      "View this provider's profile to explore their services and details."}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Active services</span>
                      <span className="font-semibold">
                        {provider.services.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted">Starting price</span>
                      <span className="font-semibold">
                        {lowestPrice === null
                          ? "Not listed"
                          : formatPrice(lowestPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-background p-3">
                    <p className="text-xs font-semibold text-foreground">
                      Weekly availability
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {provider.availabilitySummary ??
                        "Availability information unavailable"}
                    </p>
                  </div>

                  {provider.services.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-muted">
                        Services offered
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {provider.services.slice(0, 3).map((service) => (
                          <span
                            key={service.id}
                            className="rounded-full border border-line px-2.5 py-1 text-xs text-muted"
                          >
                            {service.name}
                          </span>
                        ))}
                        {provider.services.length > 3 && (
                          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                            +{provider.services.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex gap-2 pt-5">
                    <Link
                      href={`/providers/${provider.id}`}
                      className="btn-primary inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold"
                    >
                      View profile
                    </Link>

                    <Link
                      href={`/services?q=${encodeURIComponent(provider.business_name)}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-line px-3 py-2.5 text-sm font-semibold transition hover:border-brand hover:text-brand"
                    >
                      View services
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
