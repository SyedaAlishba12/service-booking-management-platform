
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { discoveryApi } from "@/api/discovery_api";
import type { DiscoveryService } from "@/api/discovery_api";
import type { Category } from "@/types/category";
import { Card } from "../ui/Card";
import Input from "../ui/Input";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatPrice(price: string) {
  const amount = Number(price);
  return Number.isFinite(amount)
    ? `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`
    : `PKR ${price}`;
}

export default function ServicesSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<DiscoveryService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [serviceResult, categoryResult] = await Promise.allSettled([
          discoveryApi.listServices(),
          discoveryApi.listCategories(),
        ]);

        if (cancelled) return;

        if (serviceResult.status === "fulfilled") {
          setServices(
            serviceResult.value.items.filter((service) => service.is_active),
          );
        } else {
          setError(true);
        }

        if (categoryResult.status === "fulfilled") {
          setCategories(categoryResult.value.filter((category) => category.is_active));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/services?q=${encodeURIComponent(value)}` : "/services");
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <section id="services" className="section scroll-mt-20">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            Search services
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl">Find the service you need</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Search available services, compare prices, and discover professionals.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex max-w-2xl gap-2">
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted">
              <SearchIcon />
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for a service or provider..."
              className="h-12 pl-11 pr-4"
              aria-label="Search for a service or provider"
            />
          </div>
          <button
            type="submit"
            className="btn-primary rounded-xl px-5 text-sm font-semibold"
          >
            Search
          </button>
        </form>

        <div className="mt-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Explore
            </p>
            <h3 className="mt-2 text-xl font-bold">Available services</h3>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
          >
            Browse all services <ArrowIcon />
          </Link>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-muted" role="status">
            Loading services...
          </p>
        )}

        {!loading && error && services.length === 0 && (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            Services are temporarily unavailable. Please try the discovery page again later.
          </p>
        )}

        {!loading && !error && services.length === 0 && (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            No active services are available yet.
          </p>
        )}

        {!loading && services.length > 0 && (
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {services.slice(0, 3).map((service) => (
              <Card key={service.id} variant="default" hover className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
                  {service.name.charAt(0).toUpperCase()}
                </div>

                <p className="mt-5 text-xs font-semibold text-brand">
                  {categoryNames.get(service.category_id) || "Service"}
                </p>
                <h3 className="mt-1 text-lg font-bold">{service.name}</h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted">
                  {service.description || "View details and booking options for this service."}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <span className="text-sm font-semibold">
                    {formatPrice(service.price)}
                  </span>
                  <Link
                    href={`/services?q=${encodeURIComponent(service.name)}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-secondary"
                  >
                    View <ArrowIcon />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
