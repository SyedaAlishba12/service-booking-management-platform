import Link from "next/link";
import { Card } from "../ui/Card";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
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

const providers = [
  {
    name: "Sarah's Salon",
    category: "Beauty & Wellness",
    rating: "4.8",
    services: "12 services",
  },
  {
    name: "CleanPro Services",
    category: "Home Services",
    rating: "4.9",
    services: "18 services",
  },
  {
    name: "Learning Studio",
    category: "Tutoring & Learning",
    rating: "4.7",
    services: "9 services",
  },
];

export default function FeaturedProviders() {
  return (
    <section id="providers" className="section scroll-mt-20">
      <div className="container">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Providers
            </p>

            <h2 className="mt-2 text-2xl sm:text-3xl">
              People behind the services
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Compare professionals by their services, ratings, and
              availability.
            </p>
          </div>

          <Link
            href="#services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
          >
            Browse services
            <ArrowIcon />
          </Link>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {providers.map((provider) => (
            <Card
              key={provider.name}
              variant="default"
              hover
              className="p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar text-base font-bold text-white">
                  {provider.name.charAt(0)}
                </div>

                <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                  ★ {provider.rating}
                </span>
              </div>

              <h3 className="mt-5 text-base font-bold">
                {provider.name}
              </h3>

              <p className="mt-1 text-xs text-muted">
                {provider.category}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-xs font-medium text-muted">
                  {provider.services}
                </span>

                <span className="text-xs font-semibold text-brand">
                  Available
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}