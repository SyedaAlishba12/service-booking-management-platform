import { Card } from "@/components/ui/Card";
import type { DashboardStat } from "@/types/dashboard";

interface DashboardStatsProps {
  stats: DashboardStat[];
}

function TrendUpIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M4 13.5 9 8.5l3 3L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M12.5 7H16v3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="m4 6.5 5 5 3-3 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M12.5 12.5H16V9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardStats({
  stats,
}: DashboardStatsProps) {
  return (
    <section aria-labelledby="overview-heading">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
            Overview
          </p>

          <h2
            id="overview-heading"
            className="mt-1 text-xl font-bold tracking-tight text-foreground"
          >
            Your activity
          </h2>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="rounded-none border-0 shadow-none"
          >
            <div className="p-5">
              <p className="text-sm font-medium text-muted">
                {stat.label}
              </p>

              <div className="mt-2 flex items-end gap-2">
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>

                {stat.trend === "up" && (
                  <span
                    className="mb-1 text-success"
                    aria-label="Trending up"
                  >
                    <TrendUpIcon />
                  </span>
                )}

                {stat.trend === "down" && (
                  <span
                    className="mb-1 text-danger"
                    aria-label="Trending down"
                  >
                    <TrendDownIcon />
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-muted">
                {stat.detail}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}