import Link from "next/link";
import Button from "../ui/Button";
import { Card } from "../ui/Card";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M19 10.2c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="10"
        r="2.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 3v4M16 3v4M4 9h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute -right-48 -top-48 h-[500px] w-[500px] rounded-full bg-brand-soft/30 blur-3xl" />

      <div className="container relative section">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.92fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-muted shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              A simpler way to book services
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.65rem]">
              Find the right service.
              <span className="block text-brand">
                Book the right time.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Discover trusted professionals, compare services, and choose an
              appointment that actually fits your schedule.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/#services">
                <Button variant="primary" size="lg">
                  Explore Services
                </Button>
              </Link>

              <Link href="/#how-it-works">
                <Button variant="outline" size="lg">
                  How It Works
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span>✓ Trusted providers</span>
              <span>✓ Flexible scheduling</span>
              <span>✓ One place to manage bookings</span>
            </div>
          </div>

          <Card
            variant="default"
            className="overflow-hidden border border-line bg-surface p-0 shadow-[0_20px_55px_rgba(8,45,110,0.09)]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Booking console
                </p>

                <h2 className="mt-1 text-lg font-bold">
                  Find an available service
                </h2>
              </div>

              <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
                8 available
              </span>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-line bg-background p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Service
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <SearchIcon />
                  </span>

                  <div>
                    <p className="text-sm font-semibold">
                      Hair Styling
                    </p>

                    <p className="text-xs text-muted">
                      Beauty & Wellness
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-background p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Location
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                    <LocationIcon />
                    Your area
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-background p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Date
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                    <CalendarIcon />
                    Tomorrow
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-sidebar px-4 py-3.5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/55">
                      Earliest available
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      Tomorrow · 10:30 AM
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
                    4.8 ★
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                fullWidth
                size="md"
                className="mt-3"
              >
                Find Available Services
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}