"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import UserMenu from "./UserMenu";

interface DashboardHeaderProps {
  title?: string;
  description?: string;
  breadcrumb?: string[];
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  actions?: ReactNode;
  onMenuClick?: () => void;
}

const roundBtn =
  "relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground shadow-sm transition-all duration-200 hover:bg-brand-soft hover:text-brand hover:shadow-md";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function DashboardHeader({
  userName = "Ali",
  userEmail,
  notificationCount = 0,
  actions,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <header className="px-4 pb-3 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="flex min-h-11 items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className={`${roundBtn} lg:hidden`}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </button>

            {/* Optional page-level actions */}
            {actions}
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/services"
              className="hidden h-10 items-center gap-2 rounded-full bg-sidebar px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sidebar-hover hover:shadow-md sm:inline-flex"
            >
              <span className="text-lg leading-none">+</span>
              Book now
            </Link>

            <button
              type="button"
              aria-label="Search"
              className={roundBtn}
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              aria-label="Notifications"
              className={roundBtn}
            >
              <BellIcon />

              {notificationCount > 0 && (
                <span
                  aria-label={`${notificationCount} unread notifications`}
                  className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-white"
                />
              )}
            </button>

            <UserMenu
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </div>
      </div>
    </header>
  );
}