
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { discoveryApi } from "@/api/discovery_api";
import type { Category } from "@/types/category";
import { Card } from "../ui/Card";

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

export default function ServiceCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    discoveryApi
      .listCategories()
      .then((result) => {
        if (!cancelled) {
          setCategories(
            result.filter((category) => category.is_active).sort(
              (a, b) => a.display_order - b.display_order,
            ),
          );
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="categories" className="section scroll-mt-20 bg-surface">
      <div className="container">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Categories
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl">Explore by category</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Choose a category to discover related services and providers.
            </p>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
          >
            Browse all services <ArrowIcon />
          </Link>
        </div>

        {loading && (
          <p className="mt-7 rounded-2xl border border-line bg-background p-5 text-sm text-muted" role="status">
            Loading categories...
          </p>
        )}

        {!loading && error && (
          <div className="mt-7 rounded-2xl border border-line bg-background p-5">
            <p className="text-sm text-muted">
              Categories are temporarily unavailable. You can still browse all services.
            </p>
            <Link
              href="/services"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-secondary"
            >
              Browse services <ArrowIcon />
            </Link>
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <p className="mt-7 rounded-2xl border border-line bg-background p-5 text-sm text-muted">
            No active categories are available yet.
          </p>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} variant="default" hover className="p-5">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-soft text-lg font-bold text-brand">
                  {category.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    category.name.charAt(0).toUpperCase()
                  )}
                </div>

                <h3 className="mt-5 text-lg font-bold">{category.name}</h3>
                <p className="mt-2 min-h-10 text-sm leading-6 text-muted">
                  {category.description || "Explore services in this category."}
                </p>

                <Link
                  href={`/services?category_id=${encodeURIComponent(category.id)}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
                >
                  Explore services <ArrowIcon />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
