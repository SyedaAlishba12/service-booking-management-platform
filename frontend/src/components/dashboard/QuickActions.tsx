import Link from "next/link";

import type { QuickAction } from "@/types/dashboard";

interface QuickActionsProps {
  actions: QuickAction[];
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

export default function QuickActions({
  actions,
}: QuickActionsProps) {
  return (
    <section
      className="mt-8"
      aria-labelledby="actions-heading"
    >
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
          Quick access
        </p>

        <h2
          id="actions-heading"
          className="mt-1 text-xl font-bold tracking-tight text-foreground"
        >
          What do you need?
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={`${action.label}-${action.href}`}
            href={action.href}
            className={[
              "group rounded-card border p-5 transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-md",
              action.primary
                ? "border-brand bg-brand text-white hover:bg-brand-dark"
                : "border-line bg-surface text-foreground hover:border-line-blue hover:bg-brand-soft",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={[
                    "font-bold",
                    action.primary
                      ? "text-white"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {action.label}
                </p>

                <p
                  className={[
                    "mt-1 text-sm leading-5",
                    action.primary
                      ? "text-white/75"
                      : "text-muted",
                  ].join(" ")}
                >
                  {action.description}
                </p>
              </div>

              <span
                className={[
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 group-hover:translate-x-1",
                  action.primary
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-line bg-white text-brand group-hover:border-brand",
                ].join(" ")}
              >
                <ArrowRightIcon />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}