import { Card } from "@/components/ui/Card";
import type { DashboardActivity } from "@/types/dashboard";

interface RecentActivityProps {
  activity: DashboardActivity[];
}

export default function RecentActivity({
  activity,
}: RecentActivityProps) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="border-b border-line p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
          Updates
        </p>

        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          Recent activity
        </h2>
      </div>

      <div className="p-5 md:p-6">
        {activity.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            No recent activity to show.
          </p>
        ) : (
          <div className="relative">
            <div className="absolute bottom-3 left-[5px] top-3 w-px bg-line" />

            <div className="space-y-6">
              {activity.map((item, index) => (
                <div
                  key={`${item.title}-${item.time}-${index}`}
                  className="relative flex gap-4"
                >
                  <div className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-brand bg-surface" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {item.title}
                      </p>

                      <span className="rounded-pill bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                        {item.type}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-5 text-muted">
                      {item.description}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}