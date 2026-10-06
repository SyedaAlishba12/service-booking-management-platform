import { Card } from "../ui/Card";

export default function DashboardPreview() {
  return (
    <section className="section-sm bg-surface">
      <div className="container">
        <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Your workspace
            </p>

            <h2 className="mt-2 text-2xl sm:text-3xl">
              Your bookings, at a glance
            </h2>

            <p className="mt-4 max-w-md text-sm leading-6 text-muted">
              Once you start booking, your dashboard keeps your appointments,
              activity, and service history organized in one place.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              {[
                "See your next appointment",
                "Track your booking activity",
                "Manage your services in one place",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-success">
                    ✓
                  </span>

                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Small visual representation of the real dashboard */}
          <Card
            variant="glass"
            className="overflow-hidden p-0"
          >
            <div className="flex min-h-[300px]">
              {/* Small sidebar representation */}
              <aside className="hidden w-32 shrink-0 bg-white p-3 shadow-[4px_0_18px_rgba(8,45,110,0.04)] sm:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar text-xs font-bold text-white">
                    S
                  </span>

                  <span className="text-[10px] font-bold">
                    ServiceHub
                  </span>
                </div>

                <div className="mt-7 space-y-1">
                  <div className="rounded-lg bg-sidebar px-2.5 py-2 text-[10px] font-semibold text-white">
                    Dashboard
                  </div>

                  <div className="px-2.5 py-2 text-[10px] text-muted">
                    Calendar
                  </div>

                  <div className="px-2.5 py-2 text-[10px] text-muted">
                    Bookings
                  </div>

                  <div className="px-2.5 py-2 text-[10px] text-muted">
                    Services
                  </div>

                  <div className="px-2.5 py-2 text-[10px] text-muted">
                    Providers
                  </div>
                </div>
              </aside>

              {/* Simplified dashboard content */}
              <div className="min-w-0 flex-1 bg-background p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-muted">
                      Sunday, October 4
                    </p>

                    <h3 className="mt-1 text-base font-bold">
                      Welcome back, Ali
                    </h3>
                  </div>

                  <span className="rounded-full bg-success-soft px-2 py-1 text-[9px] font-semibold text-success">
                    3 notifications
                  </span>
                </div>

                {/* Next appointment — inspired by actual dashboard */}
                <div className="mt-4 rounded-2xl bg-sidebar p-4 text-white">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-white/55">
                    Next appointment
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold">
                        Hair Styling
                      </p>

                      <p className="mt-1 text-[9px] text-white/60">
                        Sarah&apos;s Salon · Oct 12 · 10:30 AM
                      </p>
                    </div>

                    <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-semibold">
                      Confirmed
                    </span>
                  </div>
                </div>

                {/* Small stats */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-line bg-white p-3">
                    <p className="text-[8px] text-muted">
                      Bookings
                    </p>

                    <p className="mt-1 text-base font-bold text-brand">
                      128
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-3">
                    <p className="text-[8px] text-muted">
                      Upcoming
                    </p>

                    <p className="mt-1 text-base font-bold text-secondary">
                      08
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-3">
                    <p className="text-[8px] text-muted">
                      Completed
                    </p>

                    <p className="mt-1 text-base font-bold text-success">
                      96
                    </p>
                  </div>
                </div>

                {/* Three simple dashboard-style cards */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-sidebar p-3 text-white">
                    <p className="text-[8px] text-white/55">
                      Overall
                    </p>

                    <p className="mt-2 text-base font-bold">
                      128
                    </p>

                    <div className="mt-2 h-1 rounded-full bg-white/10">
                      <div className="h-full w-3/4 rounded-full bg-white/65" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-3">
                    <p className="text-[8px] font-semibold text-muted">
                      Weekly
                    </p>

                    <div className="mt-4 flex h-7 items-end gap-1">
                      {[35, 55, 42, 70, 48, 82, 60].map(
                        (height, index) => (
                          <div
                            key={index}
                            className="flex-1 rounded-t bg-brand-soft"
                            style={{ height: `${height}%` }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-white p-3">
                    <p className="text-[8px] font-semibold text-muted">
                      Progress
                    </p>

                    <p className="mt-2 text-base font-bold text-brand">
                      72%
                    </p>

                    <div className="mt-2 h-1 rounded-full bg-line">
                      <div className="h-full w-[72%] rounded-full bg-brand" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}