import Link from "next/link";

import { Card } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import type { DashboardAppointment } from "@/types/dashboard";

interface UpcomingScheduleProps {
  bookings: DashboardAppointment[];
  viewAllHref?: string;
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
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

export default function UpcomingSchedule({
  bookings,
  viewAllHref = "/dashboard/bookings",
}: UpcomingScheduleProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-5 md:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
            Schedule
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            Upcoming bookings
          </h2>
        </div>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-secondary"
        >
          View all
          <ArrowRightIcon />
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-muted">
            You have no upcoming bookings.
          </p>

          <Link
            href="/services"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            Find a service
            <ArrowRightIcon />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {bookings.map((booking) => (
            <Link
              key={`${booking.day}-${booking.service}-${booking.time}`}
              href={viewAllHref}
              className="group flex gap-4 p-5 transition hover:bg-surface-blue md:p-6"
            >
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand">
                <span className="text-[10px] font-bold tracking-wider">
                  {booking.month}
                </span>

                <span className="text-xl font-bold leading-5">
                  {booking.day}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground group-hover:text-brand">
                      {booking.service}
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      {booking.provider}
                    </p>
                  </div>

                  <StatusBadge status={booking.status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted">
                  <span>{booking.time}</span>
                  <span>{booking.price}</span>
                </div>
              </div>

              <span className="hidden h-8 w-8 shrink-0 self-center items-center justify-center rounded-full border border-line text-brand transition-all duration-200 group-hover:translate-x-1 group-hover:border-brand group-hover:bg-brand-soft sm:flex">
                <ArrowRightIcon />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}