interface DashboardWelcomeProps {
  name: string;
  dateLabel?: string;
  description?: string;
}

export default function DashboardWelcome({
  name,
  dateLabel,
  description = "Here's what's happening with your bookings today.",
}: DashboardWelcomeProps) {
  return (
    <section className="mb-7">
      {dateLabel && (
        <p className="text-sm font-semibold text-brand">
          {dateLabel}
        </p>
      )}

      <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Good afternoon, {name}.
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted md:text-base">
        {description}
      </p>
    </section>
  );
}