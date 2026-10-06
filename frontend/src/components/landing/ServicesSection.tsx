import Link from "next/link";
import { Card } from "../ui/Card";
import Input from "../ui/Input";

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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const popularServices = [
  {
    title: "Hair Styling",
    category: "Beauty & Wellness",
    description: "Professional haircuts, styling, and salon appointments.",
    price: "From PKR 1,500",
  },
  {
    title: "Home Cleaning",
    category: "Home Services",
    description: "Reliable professionals for regular or one-time cleaning.",
    price: "From PKR 2,500",
  },
  {
    title: "Math Tutoring",
    category: "Tutoring & Learning",
    description: "Find tutors for school, college, and exam preparation.",
    price: "From PKR 1,000",
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="section scroll-mt-20">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            Search services
          </p>

          <h2 className="mt-2 text-2xl sm:text-3xl">
            Find the service you need
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            Search for a service, explore popular options, and discover
            professionals who can help.
          </p>
        </div>

        <div className="mt-6">
          <div className="relative max-w-2xl">
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted">
              <SearchIcon />
            </div>

            <Input
              placeholder="Search for a service..."
              className="h-12 pl-11 pr-4"
              aria-label="Search for a service"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Popular
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Services people are booking
            </h3>
          </div>

          <Link
            href="#categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
          >
            Browse categories
            <ArrowIcon />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {popularServices.map((service) => (
            <Card
              key={service.title}
              variant="default"
              hover
              className="p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
                  S
                </div>

                <span className="text-xs font-semibold text-muted">
                  {service.price}
                </span>
              </div>

              <p className="mt-5 text-xs font-semibold text-brand">
                {service.category}
              </p>

              <h3 className="mt-1 text-lg font-bold">
                {service.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted">
                {service.description}
              </p>

              <Link
                href="#providers"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
              >
                Find providers
                <ArrowIcon />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}