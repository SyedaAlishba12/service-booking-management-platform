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

const serviceCategories = [
  {
    title: "Beauty & Wellness",
    description: "Salons, barbers, spas, and wellness professionals.",
    icon: "✂",
    count: "24+ services",
  },
  {
    title: "Home Services",
    description: "Reliable professionals for repairs and maintenance.",
    icon: "⌂",
    count: "18+ services",
  },
  {
    title: "Tutoring & Learning",
    description: "Tutors and learning professionals for different needs.",
    icon: "▤",
    count: "15+ services",
  },
];

export default function ServiceCategories() {
  return (
    <section id="categories" className="section scroll-mt-20 bg-surface">
      <div className="container">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Categories
            </p>

            <h2 className="mt-2 text-2xl sm:text-3xl">
              Explore by category
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Start with a category and discover the services and providers
              available for you.
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
          {serviceCategories.map((category) => (
            <Card
              key={category.title}
              variant="default"
              hover
              className="p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-lg font-bold text-brand">
                  {category.icon}
                </div>

                <span className="text-xs font-semibold text-muted">
                  {category.count}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold">
                {category.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted">
                {category.description}
              </p>

              <Link
                href="#providers"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
              >
                Explore providers
                <ArrowIcon />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}