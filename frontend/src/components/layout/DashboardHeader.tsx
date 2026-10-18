
"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  showBookNow?: boolean;
  searchInDashboard?: boolean;
}

const roundBtn =
  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-foreground shadow-sm transition-all duration-200 hover:bg-brand-soft hover:text-brand hover:shadow-md";

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

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-4 w-4"
    >
      <path d="m6 6 12 12M18 6 6 18" />
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
  showBookNow = false,
  searchInDashboard = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchValue.trim();
    const params = new URLSearchParams();

    if (searchInDashboard) {
      params.set("view", "dashboard");
    }

    if (query) {
      params.set("search", query);
    }

    const queryString = params.toString();

    router.push(`/services${queryString ? `?${queryString}` : ""}`);
    setSearchOpen(false);
  }

  return (
    <header className="px-4 pb-3 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1380px]">
        <div className="flex min-h-11 items-center justify-between gap-3">
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

            {actions}
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {showBookNow && (
              <Link
                href="/services?view=dashboard"
                className="hidden h-10 items-center gap-2 rounded-full bg-sidebar px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sidebar-hover hover:shadow-md sm:inline-flex"
              >
                <span className="text-lg leading-none">+</span>
                Book now
              </Link>
            )}

            <button
              type="button"
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
              className={roundBtn}
            >
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </button>

            <Link
              href="/notifications"
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
            </Link>

            <UserMenu userName={userName} userEmail={userEmail} />
          </div>
        </div>

        {/* Expandable dashboard search */}
        {searchOpen && (
          <form
            onSubmit={handleSearch}
            role="search"
            aria-label="Search services"
            className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-sm focus-within:border-brand"
          >
            <label htmlFor="dashboard-service-search" className="sr-only">
              Search services or providers
            </label>

            <input
              autoFocus
              id="dashboard-service-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search services or providers..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
            />

            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <SearchIcon />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
