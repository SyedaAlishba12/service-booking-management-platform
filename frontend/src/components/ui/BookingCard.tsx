import { Card } from "./Card";
import StatusBadge, { type Status } from "./StatusBadge";

interface BookingCardProps {
  serviceName: string;
  providerName?: string;
  customerName?: string;
  date: string;
  time: string;
  status: Status;
  price?: number;
  onView?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  variant?: "default" | "compact";
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="3"
      />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export default function BookingCard({
  serviceName,
  providerName,
  customerName,
  date,
  time,
  status,
  price,
  onView,
  onAction,
  actionLabel,
  variant = "default",
}: BookingCardProps) {
  if (variant === "compact") {
    return (
      <Card
        variant="default"
        className="relative min-h-[165px] overflow-hidden p-4"
      >
        <div className="flex items-center justify-between text-foreground">
          <CalendarIcon />
          <DotsIcon />
        </div>

        <div className="mt-3 text-base font-bold leading-5 text-foreground">
          {serviceName}
        </div>

        {providerName && (
          <div className="text-sm text-muted">
            {providerName}
          </div>
        )}

        <div className="mt-2 text-sm font-medium text-foreground">
          {date} · {time}
        </div>

        <div className="mt-1.5">
          <StatusBadge status={status} />
        </div>

        <span className="absolute bottom-0 right-0 flex h-10 w-12 items-center justify-center rounded-tl-3xl bg-sidebar text-white">
          <ArrowIcon />
        </span>
      </Card>
    );
  }

  return (
    <Card hover variant="default">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {serviceName}
            </h3>

            <StatusBadge status={status} />
          </div>

          {providerName && (
            <p className="mt-1.5 text-sm text-muted">
              Provider: {providerName}
            </p>
          )}

          {customerName && (
            <p className="mt-1.5 text-sm text-muted">
              Customer: {customerName}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="font-medium text-foreground">
              {date}
            </span>

            <span className="text-muted">
              {time}
            </span>

            {typeof price === "number" && (
              <span className="font-bold text-brand">
                PKR {price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {(onView || onAction) && (
          <div className="flex shrink-0 gap-2">
            {onView && (
              <button
                type="button"
                onClick={onView}
                className="inline-flex items-center gap-2 rounded-md border border-brand px-3.5 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
              >
                <span>View</span>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M7.5 4.5L13 10L7.5 15.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            {onAction && actionLabel && (
              <button
                type="button"
                onClick={onAction}
                className="btn-primary inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}