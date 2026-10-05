"use client";

import { useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import DashboardWelcome from "@/components/dashboard/DashboardWelcome";
import DashboardHero from "@/components/dashboard/DashboardHero";
import DashboardStats from "@/components/dashboard/DashboardStats";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";

import type {
  DashboardActivity,
  DashboardAppointment,
  DashboardStat,
  QuickAction,
} from "@/types/dashboard";

const upcomingBookings: DashboardAppointment[] = [
  {
    day: "12",
    month: "OCT",
    time: "10:30 AM",
    service: "Hair Styling",
    provider: "Sarah's Salon",
    status: "confirmed",
    price: "$45",
    paymentStatus: "Payment confirmed",
  },
  {
    day: "14",
    month: "OCT",
    time: "2:00 PM",
    service: "Deep Cleaning",
    provider: "CleanPro Services",
    status: "pending",
    price: "$80",
    paymentStatus: "Payment pending",
  },
];

const dashboardStats: DashboardStat[] = [
  {
    label: "Total bookings",
    value: "128",
    detail: "12% more than last month",
    trend: "up",
  },
  {
    label: "Upcoming",
    value: "08",
    detail: "3 scheduled this week",
    trend: "neutral",
  },
  {
    label: "Completed",
    value: "96",
    detail: "8% more than last month",
    trend: "up",
  },
  {
    label: "Total spent",
    value: "84.5K",
    detail: "PKR this month",
    trend: "neutral",
  },
];

const dashboardActivity: DashboardActivity[] = [
  {
    title: "Photography Session",
    description: "Lens Studio · $120",
    time: "Sep 28",
    type: "Completed",
  },
  {
    title: "AC Maintenance",
    description: "CoolCare · $60",
    time: "Sep 24",
    type: "Completed",
  },
  {
    title: "Home Cleaning",
    description: "CleanPro Services · $75",
    time: "Sep 20",
    type: "Completed",
  },
];

const quickActions: QuickAction[] = [
  {
    label: "Find a service",
    description: "Browse services and choose a convenient time",
    href: "/services",
    primary: true,
  },
  {
    label: "My bookings",
    description: "View upcoming and past appointments",
    href: "/dashboard/bookings",
  },
  {
    label: "Find providers",
    description: "Explore trusted service providers",
    href: "/providers",
  },
];

const initialGoals = [
  { text: "Complete 25 bookings", done: true },
  { text: "Leave 5 reviews", done: true },
  { text: "Try 2 new providers", done: false },
  { text: "Reschedule less than 3 times", done: false },
];

const days = ["M", "T", "W", "T", "F", "S", "S"];

function DotsIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5 9-10" />
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

function Ring({
  r,
  pct,
  color,
}: {
  r: number;
  pct: number;
  color: string;
}) {
  const circumference = 2 * Math.PI * r;

  return (
    <>
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--brand-soft)"
        strokeWidth="7"
      />

      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - circumference * pct}
      />
    </>
  );
}

function WeeklyChart() {
  return (
    <div className="mt-5">
      <svg
        viewBox="0 0 420 130"
        preserveAspectRatio="none"
        className="h-[135px] w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="weekly-bookings"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0"
              stopColor="var(--brand)"
              stopOpacity="0.18"
            />
            <stop
              offset="1"
              stopColor="var(--brand)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[25, 60, 95].map((y) => (
          <line
            key={y}
            x1="0"
            x2="420"
            y1={y}
            y2={y}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
        ))}

        <path
          d="M0 95 L50 42 L90 82 L140 25 L190 78 L240 22 L290 68 L340 18 L380 88 L420 35 L420 130 L0 130Z"
          fill="url(#weekly-bookings)"
        />

        <path
          d="M0 95 C25 78 35 42 50 42 S75 87 90 82 S120 25 140 25 S170 82 190 78 S220 22 240 22 S270 73 290 68 S320 18 340 18 S365 92 380 88 S405 40 420 35"
          fill="none"
          stroke="var(--sidebar)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <path
          d="M0 112 C40 103 60 75 100 88 S160 105 200 67 S260 80 300 48 S370 80 420 60"
          fill="none"
          stroke="var(--secondary)"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-2 flex justify-between">
        {days.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              index === 5
                ? "bg-sidebar text-white"
                : "text-muted"
            }`}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [goals, setGoals] = useState(initialGoals);

  const completedGoals = goals.filter(
    (goal) => goal.done
  ).length;

  const toggleGoal = (index: number) => {
    setGoals((current) =>
      current.map((goal, goalIndex) =>
        goalIndex === index
          ? { ...goal, done: !goal.done }
          : goal
      )
    );
  };

  const sidebarItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Calendar", href: "/dashboard/calendar" },
    { label: "Bookings", href: "/dashboard/bookings" },
    { label: "Services", href: "/dashboard/services" },
    { label: "Providers", href: "/dashboard/providers" },
    { label: "Reviews", href: "/dashboard/reviews" },
    { label: "Categories", href: "/dashboard/categories" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  const nextAppointment =
    upcomingBookings.length > 0
      ? {
          ...upcomingBookings[0],
          dateLabel: "October 12",
        }
      : null;

  return (
    <DashboardLayout
      sidebarItems={sidebarItems}
      activeHref="/dashboard"
      userName="Ali"
      notificationCount={3}
    >
      <div className="space-y-7">
        {/* =====================================================
            WELCOME
        ====================================================== */}
        <DashboardWelcome
          name="Ali"
          dateLabel="Sunday, October 4"
        />

        {/* =====================================================
            NEXT APPOINTMENT
        ====================================================== */}
        <DashboardHero
          appointment={nextAppointment}
          onReschedule={() => {
            // Reschedule flow will be connected later.
          }}
        />

        {/* =====================================================
            STATS
        ====================================================== */}
        <DashboardStats stats={dashboardStats} />

        {/* =====================================================
            ORIGINAL THREE CARDS
            KEPT AS-IS
        ====================================================== */}
        <section className="grid gap-5 xl:grid-cols-[1.05fr_1.25fr_0.85fr]">
          {/* Overall information */}
          <Card variant="dark" className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">
                Overall information
              </div>

              <DotsIcon className="text-white/80" />
            </div>

            <div className="mt-5 flex items-end gap-6">
              <div>
                <span className="text-4xl font-bold leading-none">
                  128
                </span>

                <span className="ml-2 text-sm leading-5 text-white/80">
                  bookings
                  <br />
                  all time
                </span>
              </div>

              <div className="border-l border-white/25 pl-6">
                <span className="text-4xl font-bold leading-none">
                  12
                </span>

                <span className="ml-2 text-sm leading-5 text-white/80">
                  pending
                  <br />
                  bookings
                </span>
              </div>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-3/4 rounded-full bg-white" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { n: "08", l: "Upcoming" },
                { n: "96", l: "Completed" },
                { n: "12", l: "Cancelled" },
              ].map((item) => (
                <div
                  key={item.l}
                  className="rounded-2xl bg-white px-2.5 py-3 text-center text-foreground"
                >
                  <div className="text-xl font-bold leading-none">
                    {item.n}
                  </div>

                  <div className="mt-1.5 text-xs font-medium text-muted">
                    {item.l}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly bookings */}
          <Card variant="glass" className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold leading-6 text-foreground">
                Weekly bookings
              </div>

              <span className="rounded-full bg-success-soft px-3 py-1 text-sm font-semibold text-success">
                +12.4%
              </span>
            </div>

            <div className="mt-2 flex gap-5 text-sm text-muted">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sidebar" />
                Confirmed
              </span>

              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-secondary/60" />
                Pending
              </span>
            </div>

            <WeeklyChart />
          </Card>

          {/* Month progress */}
          <Card variant="default" className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold leading-6 text-foreground">
                Month progress
              </div>
            </div>

            <p className="mt-2 text-sm text-muted">
              <b className="text-base text-foreground">
                72%
              </b>{" "}
              of your monthly target
            </p>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold tracking-wide text-foreground">
                  OVERVIEW
                </div>

                <ul className="mt-2 space-y-2 text-sm text-muted">
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sidebar" />
                    Confirmed
                  </li>

                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                    Completed
                  </li>

                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-line-blue" />
                    Pending
                  </li>
                </ul>
              </div>

              <div className="relative h-[98px] w-[98px] shrink-0">
                <svg
                  viewBox="0 0 100 100"
                  className="-rotate-90"
                  aria-hidden="true"
                >
                  <Ring
                    r={42}
                    pct={0.72}
                    color="var(--sidebar)"
                  />

                  <Ring
                    r={31}
                    pct={0.55}
                    color="var(--secondary)"
                  />

                  <Ring
                    r={20}
                    pct={0.3}
                    color="var(--line-blue)"
                  />
                </svg>

                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  72%
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                shape="pill"
                className="h-10 w-10 shrink-0 p-0"
                aria-label="Share report"
              >
                <ArrowIcon />
              </Button>

              <Button
                variant="outline"
                size="md"
                shape="pill"
                className="h-10 flex-1"
              >
                Download report
              </Button>
            </div>
          </Card>
        </section>

        {/* =====================================================
            UPCOMING SCHEDULE
        ====================================================== */}
        <UpcomingSchedule
          bookings={upcomingBookings}
          viewAllHref="/dashboard/bookings"
        />

        {/* =====================================================
            QUICK ACCESS + PERSONAL GOALS
        ====================================================== */}
        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <QuickActions actions={quickActions} />

          <Card variant="glass" className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  This month
                </p>

                <h2 className="mt-1 text-lg font-bold text-foreground">
                  Personal goals
                </h2>
              </div>

              <div className="text-right">
                <span className="text-xl font-bold text-brand">
                  {completedGoals}
                </span>

                <span className="text-sm text-muted">
                  /{goals.length}
                </span>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-brand-soft">
              <div
                className="h-full rounded-full bg-sidebar transition-all duration-300"
                style={{
                  width: `${(completedGoals / goals.length) * 100}%`,
                }}
              />
            </div>

            <div className="mt-4 space-y-1">
              {goals.map((goal, index) => (
                <button
                  key={goal.text}
                  type="button"
                  onClick={() => toggleGoal(index)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/70 focus-visible:outline-3 focus-visible:outline-secondary"
                >
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                      goal.done
                        ? "bg-sidebar text-white"
                        : "border border-line bg-white text-transparent",
                    ].join(" ")}
                  >
                    <CheckIcon />
                  </span>

                  <span
                    className={[
                      "text-sm",
                      goal.done
                        ? "font-semibold text-foreground"
                        : "text-muted",
                    ].join(" ")}
                  >
                    {goal.text}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </section>

        {/* =====================================================
            RECENT ACTIVITY
        ====================================================== */}
        <RecentActivity activity={dashboardActivity} />
      </div>
    </DashboardLayout>
  );
}