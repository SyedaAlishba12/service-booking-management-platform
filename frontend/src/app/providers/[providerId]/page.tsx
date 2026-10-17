
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiClient } from "@/utils/api_client";
import { useAuth } from "@/app/providers/AuthProvider";
import { reviewApi } from "@/api/review_api";
import Rating from "@/components/ui/Rating";
import type { Page } from "@/types/booking";
import type {
  ProviderRatingSummary,
  Review,
} from "@/types/review";

interface PublicProviderProfile {
  id: string;
  business_name: string;
  description: string | null;
  profile_image_url: string | null;
  location: string;
  city: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  timezone: string;
  created_at: string;
}

interface ProfileService {
  id: string;
  provider_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string | number;
  duration_minutes: number;
  service_type: "ON_SITE" | "AT_PROVIDER" | "ONLINE";
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WeeklyAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

interface AvailabilityException {
  id: string;
  provider_id: string;
  exception_date: string;
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface ProviderAvailability {
  provider_id: string;
  timezone: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
  weekly: WeeklyAvailability[];
  exceptions: AvailabilityException[];
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatPrice(price: string | number) {
  return `PKR ${Number(price).toLocaleString("en-PK")}`;
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);

  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAvailabilityRange() {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 30);

  return {
    fromDate: getDateString(today),
    toDate: getDateString(end),
  };
}

function getServiceTypeLabel(type: ProfileService["service_type"]) {
  switch (type) {
    case "ONLINE":
      return "Online";
    case "AT_PROVIDER":
      return "At provider's location";
    default:
      return "On-site";
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

export default function PublicProviderProfilePage() {
  const params = useParams<{ providerId: string }>();
  const providerId = params.providerId;
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  function navigateToBooking(bookingPath: string) {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
      return;
    }

    router.push(bookingPath);
  }

  const [provider, setProvider] =
    useState<PublicProviderProfile | null>(null);
  const [services, setServices] = useState<ProfileService[]>([]);
  const [availability, setAvailability] =
    useState<ProviderAvailability | null>(null);
  const [rating, setRating] =
    useState<ProviderRatingSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [reviewsError, setReviewsError] = useState("");

  useEffect(() => {
    if (!providerId) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setPageError("");
      setAvailabilityError("");
      setReviewsError("");

      const { fromDate, toDate } = getAvailabilityRange();

      const providerRequest =
        apiClient.get<PublicProviderProfile>(
          `/api/providers/${providerId}`,
        );

      const servicesRequest =
        apiClient.get<Page<ProfileService>>(
          `/api/services?provider_id=${encodeURIComponent(providerId)}&page=1&page_size=100`,
        );

      const availabilityRequest =
        apiClient.get<ProviderAvailability>(
          `/api/providers/${providerId}/availability?from_date=${fromDate}&to_date=${toDate}`,
        );

      const ratingRequest =
        reviewApi.getProviderRating(providerId);

      const reviewsRequest =
        reviewApi.listProviderReviews(providerId, {
          page: 1,
          page_size: 6,
        });

      try {
        const providerResult = await providerRequest;

        if (cancelled) return;
        setProvider(providerResult);

        const [
          servicesResult,
          availabilityResult,
          ratingResult,
          reviewsResult,
        ] = await Promise.allSettled([
          servicesRequest,
          availabilityRequest,
          ratingRequest,
          reviewsRequest,
        ]);

        if (cancelled) return;

        if (servicesResult.status === "fulfilled") {
          setServices(
            servicesResult.value.items.filter(
              (service) => service.is_active,
            ),
          );
        }

        if (availabilityResult.status === "fulfilled") {
          setAvailability(availabilityResult.value);
        } else {
          setAvailabilityError(
            "Working hours are currently unavailable.",
          );
        }

        if (ratingResult.status === "fulfilled") {
          setRating(ratingResult.value);
        }

        if (reviewsResult.status === "fulfilled") {
          setReviews(reviewsResult.value.items);
        } else {
          setReviewsError("Reviews could not be loaded.");
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error
              ? error.message
              : "We couldn't load this provider's profile.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-56 rounded-3xl bg-brand-soft" />
          <div className="h-8 w-1/3 rounded-lg bg-brand-soft" />
          <div className="h-4 w-2/3 rounded-lg bg-brand-soft" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-52 rounded-2xl bg-brand-soft"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (pageError || !provider) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="rounded-3xl border border-line bg-surface p-8">
          <p className="text-sm font-semibold text-brand">
            PROVIDER PROFILE
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            We couldn't find this provider
          </h1>
          <p className="mt-3 text-muted">
            {pageError ||
              "This provider may no longer be available."}
          </p>
          <Link
            href="/landing"
            className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
          >
            Explore services
          </Link>
        </div>
      </main>
    );
  }

  const activeServices = services.filter(
    (service) => service.is_active,
  );

  const weekly = (availability?.weekly ?? [])
    .filter((entry) => !entry.is_break)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const upcomingExceptions = (availability?.exceptions ?? [])
    .filter(
      (exception) =>
        exception.exception_date >= getDateString(new Date()),
    )
    .sort((a, b) =>
      a.exception_date.localeCompare(b.exception_date),
    );

  const displayRating = rating?.average_rating ?? 0;
  const reviewCount = rating?.total_reviews ?? reviews.length;

  return (
    <main className="min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand-soft via-background to-background" />

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:pt-12">
        <nav className="mb-6 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/landing" className="hover:text-brand">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-foreground">
            Provider profile
          </span>
        </nav>

        {/* Provider introduction */}
        <section className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-md">
          <div className="h-3 bg-gradient-to-r from-brand via-secondary to-brand-soft" />

          <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex justify-center md:justify-start">
              {provider.profile_image_url ? (
                <img
                  src={provider.profile_image_url}
                  alt={`${provider.business_name} profile`}
                  className="h-36 w-36 rounded-3xl border-4 border-white object-cover shadow-md sm:h-44 sm:w-44"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-brand-soft text-5xl font-bold text-brand shadow-inner sm:h-44 sm:w-44">
                  {provider.business_name
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                Service provider
              </span>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {provider.business_name}
              </h1>

              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span aria-hidden="true">ðŸ“</span>
                <span>
                  {[provider.location, provider.city]
                    .filter(Boolean)
                    .join(", ") || "Location not provided"}
                </span>
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Rating
                  value={displayRating}
                  count={reviewCount}
                  size="md"
                />
                <span className="text-sm text-muted">
                  {reviewCount === 0
                    ? "No reviews yet"
                    : `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#services"
                  className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Explore services
                </a>
                <a
                  href="#availability"
                  className="btn-outline inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  View working hours
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* About and contact */}
        <section className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <SectionHeading
              eyebrow="Get to know the provider"
              title="About"
            />
            <p className="whitespace-pre-line text-sm leading-7 text-muted">
              {provider.description?.trim() ||
                "This provider hasn't added a business description yet."}
            </p>
          </div>

          <aside className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <SectionHeading
              eyebrow="Get in touch"
              title="Contact details"
            />

            <div className="space-y-4">
              {provider.contact_phone && (
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                    â˜Ž
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Phone
                    </p>
                    <a
                      href={`tel:${provider.contact_phone}`}
                      className="break-words text-sm font-medium hover:text-brand"
                    >
                      {provider.contact_phone}
                    </a>
                  </div>
                </div>
              )}

              {provider.contact_email && (
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                    âœ‰
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Email
                    </p>
                    <a
                      href={`mailto:${provider.contact_email}`}
                      className="break-all text-sm font-medium hover:text-brand"
                    >
                      {provider.contact_email}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  â—·
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Time zone
                  </p>
                  <p className="text-sm font-medium">
                    {provider.timezone || "Not specified"}
                  </p>
                </div>
              </div>

              {!provider.contact_phone &&
                !provider.contact_email && (
                  <p className="text-sm text-muted">
                    Contact details have not been provided.
                  </p>
                )}
            </div>
          </aside>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-24 pt-16">
          <SectionHeading
            eyebrow="What you can book"
            title="Services & pricing"
            description="Explore the available services, compare prices, and choose the one that suits you."
          />

          {activeServices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
              <div className="text-4xl" aria-hidden="true">
                âœ¨
              </div>
              <h3 className="mt-4 text-xl font-bold">
                No services listed yet
              </h3>
              <p className="mt-2 text-sm text-muted">
                Check back later to see what this provider offers.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activeServices.map((service) => (
                <article
                  key={service.id}
                  className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-xl text-brand">
                      âœ¦
                    </div>
                    <span className="rounded-full bg-secondary-soft px-3 py-1 text-xs font-semibold text-brand">
                      {getServiceTypeLabel(service.service_type)}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold">
                    {service.name}
                  </h3>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted">
                    {service.description ||
                      "Contact the provider for more details about this service."}
                  </p>

                  {service.location && (
                    <p className="mt-3 text-xs text-muted">
                      ðŸ“ {service.location}
                    </p>
                  )}

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
                    <div>
                      <p className="text-xs font-medium text-muted">
                        Starting price
                      </p>
                      <p className="mt-1 text-xl font-bold text-brand">
                        {formatPrice(service.price)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {service.duration_minutes} minutes
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigateToBooking(
                          `/booking?provider_id=${encodeURIComponent(provider.id)}&service_id=${encodeURIComponent(service.id)}`
                        )
                      }
                      disabled={authLoading}
                      className="btn-primary inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Book now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Working hours */}
        <section id="availability" className="scroll-mt-24 pt-16">
          <SectionHeading
            eyebrow="Plan your visit"
            title="Working hours"
            description="These are the provider's configured hours. Actual appointment slots depend on the selected service and existing bookings."
          />

          {availabilityError ? (
            <div className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
              {availabilityError}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
                <h3 className="text-lg font-bold">
                  Weekly schedule
                </h3>

                {!availability ? (
                  <p className="mt-4 text-sm text-muted">
                    Loading scheduleâ€¦
                  </p>
                ) : weekly.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    No regular working hours have been configured.
                  </p>
                ) : (
                  <div className="mt-5 divide-y divide-line">
                    {WEEKDAYS.map((day, index) => {
                      const entries = weekly.filter(
                        (entry) => entry.day_of_week === index,
                      );

                      return (
                        <div
                          key={day}
                          className="flex items-start justify-between gap-4 py-3"
                        >
                          <span className="text-sm font-semibold">
                            {day}
                          </span>

                          <div className="text-right">
                            {entries.length > 0 ? (
                              entries.map((entry) => (
                                <p
                                  key={entry.id}
                                  className="text-sm text-muted"
                                >
                                  {formatTime(entry.start_time)} â€“{" "}
                                  {formatTime(entry.end_time)}
                                </p>
                              ))
                            ) : (
                              <span className="text-sm text-muted">
                                No hours listed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {availability && (
                  <p className="mt-4 text-xs text-muted">
                    Times are shown according to the provider's
                    configured time zone: {availability.timezone}.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
                <h3 className="text-lg font-bold">
                  Upcoming schedule changes
                </h3>

                <p className="mt-1 text-sm text-muted">
                  Days off and special working hours.
                </p>

                {!availability ? (
                  <p className="mt-4 text-sm text-muted">
                    Loading schedule changesâ€¦
                  </p>
                ) : upcomingExceptions.length === 0 ? (
                  <div className="mt-5 rounded-2xl bg-brand-soft p-5">
                    <p className="text-sm font-semibold text-brand">
                      No upcoming exceptions listed
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Check available appointment slots when booking.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {upcomingExceptions.map((exception) => (
                      <div
                        key={exception.id}
                        className="rounded-2xl border border-line p-4"
                      >
                        <p className="text-sm font-semibold">
                          {formatDate(exception.exception_date)}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {exception.is_day_off
                            ? "Day off"
                            : exception.start_time && exception.end_time
                              ? `${formatTime(exception.start_time)} â€“ ${formatTime(exception.end_time)}`
                              : "Special hours"}
                        </p>
                        {exception.reason && (
                          <p className="mt-1 text-xs text-muted">
                            {exception.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigateToBooking(
                      `/booking?provider_id=${encodeURIComponent(provider.id)}`
                    )
                  }
                  disabled={authLoading}
                  className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  Find an appointment
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Reviews */}
        <section id="reviews" className="scroll-mt-24 pt-16">
          <SectionHeading
            eyebrow="Customer feedback"
            title="Ratings & reviews"
            description="See feedback shared by customers about their experiences."
          />

          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-4xl font-bold">
                  {displayRating.toFixed(1)}
                  <span className="text-xl text-muted"> / 5</span>
                </p>
                <div className="mt-2">
                  <Rating
                    value={displayRating}
                    count={reviewCount}
                    size="lg"
                  />
                </div>
                <p className="mt-2 text-sm text-muted">
                  Based on {reviewCount}{" "}
                  {reviewCount === 1 ? "review" : "reviews"}
                </p>
              </div>

              {rating && (
                <div className="w-full sm:ml-auto sm:max-w-sm">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count =
                      rating.breakdown[
                        String(stars) as keyof ProviderRatingSummary["breakdown"]
                      ] ?? 0;

                    const percentage =
                      rating.total_reviews > 0
                        ? (count / rating.total_reviews) * 100
                        : 0;

                    return (
                      <div
                        key={stars}
                        className="mb-2 flex items-center gap-3 text-xs"
                      >
                        <span className="w-8 shrink-0 text-muted">
                          {stars} star
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-soft">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-muted">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-line pt-6">
              {reviewsError ? (
                <p className="text-sm text-muted">{reviewsError}</p>
              ) : reviews.length === 0 ? (
                <div className="py-5 text-center">
                  <p className="text-3xl" aria-hidden="true">
                    â˜†
                  </p>
                  <h3 className="mt-3 text-lg font-bold">
                    No reviews yet
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Customer reviews will appear here when available.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="border-b border-line pb-5 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold">
                            {review.reviewer_name?.trim() ||
                              "Customer"}
                          </h3>
                          {review.service_name && (
                            <p className="mt-1 text-xs text-muted">
                              Service: {review.service_name}
                            </p>
                          )}
                        </div>

                        <Rating
                          value={review.rating}
                          size="sm"
                          showValue={false}
                        />
                      </div>

                      {review.comment?.trim() ? (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm italic text-muted">
                          No written comment.
                        </p>
                      )}

                      <p className="mt-3 text-xs text-muted">
                        {formatDate(review.created_at)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="mt-16 overflow-hidden rounded-3xl bg-brand p-7 text-white shadow-md sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                Ready to get started?
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Book a service with {provider.business_name}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                Choose a service and check the available appointment
                times before confirming your booking.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigateToBooking(
                  `/booking?provider_id=${encodeURIComponent(provider.id)}`
                )
              }
              disabled={authLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand transition hover:bg-brand-soft disabled:opacity-60"
            >
              Book an appointment
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

