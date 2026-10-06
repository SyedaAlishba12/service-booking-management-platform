import Link from "next/link";

import { Card } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import type { DashboardAppointment } from "@/types/dashboard";

interface DashboardHeroProps {
  appointment: DashboardAppointment | null;
  onReschedule?: () => void;
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

export default function DashboardHero({
  appointment,
  onReschedule,
}: DashboardHeroProps) {
  if (!appointment) {
    return (
      <Card className="relative mb-8 overflow-hidden border-brand/15 bg-surface">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />

        <div className="p-6 pl-8 md:p-8 md:pl-10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            Next appointment
          </p>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            No upcoming appointments
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            You currently have no upcoming appointments. Find a service and
            book your next appointment when you&apos;re ready.
          </p>

          <div className="mt-6">
            <Link
              href="/services"
              className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold"
            >
              Find a service
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative mb-8 overflow-hidden border-brand/15 bg-surface">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />

      <div className="grid md:grid-cols-[1fr_auto]">
        <div className="p-6 pl-8 md:p-8 md:pl-10">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Next appointment
            </p>

            <StatusBadge status={appointment.status} />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-muted">
              {appointment.dateLabel ??
                `${appointment.month} ${appointment.day}`}{" "}
              · {appointment.time}
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {appointment.service}
            </h2>

            <p className="mt-2 text-sm font-medium text-muted">
              {appointment.provider}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/bookings"
              className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold"
            >
              View Booking
              <ArrowRightIcon />
            </Link>

            {onReschedule && (
              <button
                type="button"
                onClick={onReschedule}
                className="btn-outline inline-flex min-h-10 items-center justify-center rounded-md px-5 text-sm font-semibold"
              >
                Reschedule
              </button>
            )}
          </div>
        </div>

        <div className="flex min-w-[190px] flex-col justify-center border-t border-line bg-brand-soft px-6 py-6 md:border-l md:border-t-0 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Appointment
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-brand">
            {appointment.time.replace(/\s?(AM|PM)$/i, "")}
          </p>

          <p className="text-sm font-medium text-muted">
            {appointment.time.match(/AM|PM/i)?.[0] ?? ""} ·{" "}
            {appointment.dateLabel ??
              `${appointment.month} ${appointment.day}`}
          </p>

          <div className="mt-5 h-px bg-line-blue" />

          <p className="mt-4 text-sm font-semibold text-foreground">
            {appointment.price}
          </p>

          {appointment.paymentStatus && (
            <p className="mt-1 text-xs text-muted">
              {appointment.paymentStatus}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}