"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import Rating from "@/components/ui/Rating";
import { formatMoney } from "@/utils/format_utils";
import type { ProviderService, ProviderAvailability } from "@/types/provider";
import type { CustomerSummary, EarningsSummary, RatingSummary } from "@/types/provider_dashboard";
import { localToday, summarizeAvailability } from "./summaries";

interface SummaryShellProps {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  sample?: boolean;
  children: ReactNode;
}

function SummaryShell({ eyebrow, title, href, linkLabel, sample, children }: SummaryShellProps) {
  return (
    <Card className="flex h-full flex-col p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">{title}</h3>
        </div>
        {sample && <Badge variant="warning">Sample data</Badge>}
      </div>
      <div className="flex-1 space-y-3">{children}</div>
      {href && (
        <Link href={href} className="mt-4 text-sm font-semibold text-brand hover:underline">
          {linkLabel ?? "View all"} →
        </Link>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function ServicesSummaryCard({ services }: { services: ProviderService[] }) {
  const active = services.filter((s) => s.is_active).length;
  return (
    <SummaryShell eyebrow="Services" title="Your services" href="/dashboard/services" linkLabel="Manage services">
      <Row label="Active" value={active} />
      <Row label="Deactivated" value={services.length - active} />
      <Row label="Total" value={services.length} />
      {services.length === 0 && <p className="text-sm text-muted">Add a service so customers can book you.</p>}
    </SummaryShell>
  );
}

export function AvailabilitySummaryCard({ availability }: { availability: ProviderAvailability }) {
  const s = summarizeAvailability(availability, localToday());
  const nextOff = s.nextDayOff
    ? new Date(`${s.nextDayOff}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "None planned";
  return (
    <SummaryShell eyebrow="Availability" title="Your schedule" href="/dashboard/providers" linkLabel="Manage availability">
      <Row label="Working days" value={`${s.workingDays} / 7`} />
      <Row label="Bookable hours / week" value={`${s.weeklyHours} h`} />
      <Row label="Next day off" value={nextOff} />
      {s.workingDays === 0 && <p className="text-sm text-muted">No working hours set yet. Customers cannot book you.</p>}
    </SummaryShell>
  );
}

export function EarningsSummaryCard({ earnings }: { earnings: EarningsSummary }) {
  const change = earnings.last_month > 0 ? ((earnings.this_month - earnings.last_month) / earnings.last_month) * 100 : null;
  return (
    <SummaryShell eyebrow="Earnings" title="This month" href="/dashboard/earnings" linkLabel="View earnings" sample>
      <p className="text-3xl font-bold tracking-tight text-foreground">{formatMoney(earnings.this_month)}</p>
      <Row label="Last month" value={formatMoney(earnings.last_month)} />
      {change !== null && (
        <Row label="Change" value={`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`} />
      )}
    </SummaryShell>
  );
}

export function CustomersSummaryCard({ customers }: { customers: CustomerSummary }) {
  return (
    <SummaryShell eyebrow="Customers" title="Your customers" href="/dashboard/customers" linkLabel="View customers" sample>
      <Row label="Total customers" value={customers.total} />
      <Row label="Returning" value={customers.returning} />
    </SummaryShell>
  );
}

export function RatingSummaryCard({ rating, sample = true }: { rating: RatingSummary; sample?: boolean }) {
  return (
    <SummaryShell eyebrow="Reviews" title="Your rating" href="/dashboard/reviews" linkLabel="Read reviews" sample={sample}>
      <div className="flex items-center gap-3">
        <p className="text-3xl font-bold tracking-tight text-foreground">{rating.average.toFixed(1)}</p>
        <Rating value={rating.average} count={rating.total} size="sm" showValue={false} />
        <span className="text-sm text-muted">{rating.total} reviews</span>
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = rating.breakdown[String(star)] ?? 0;
          const pct = rating.total > 0 ? (count / rating.total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted">{star}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-right text-muted">{count}</span>
            </div>
          );
        })}
      </div>
    </SummaryShell>
  );
}
