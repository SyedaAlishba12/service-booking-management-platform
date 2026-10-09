"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/AuthProvider";

interface UserMenuProps {
  userName?: string;
  userEmail?: string;
  role?: string;
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

export default function UserMenu({
  userName,
  userEmail,
  role,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);

  const router = useRouter();

  const {
    user,
    logout,
  } = useAuth();

  const displayName =
    userName ?? user?.full_name ?? "User";

  const displayEmail =
    userEmail ?? user?.email ?? "";

  const displayRole =
    role ??
    (user?.role
      ? user.role.charAt(0) +
        user.role.slice(1).toLowerCase()
      : "Customer");

  const handleLogout = async () => {
    setOpen(false);

    await logout();

    router.replace("/login");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full transition-colors hover:bg-white/70 xl:py-1 xl:pl-1 xl:pr-2.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-white">
          {displayName
            .charAt(0)
            .toUpperCase()}
        </span>

        <span className="hidden max-w-[120px] text-left xl:block">
          <span className="block truncate text-sm font-semibold leading-5 text-foreground">
            {displayName}
          </span>

          <span className="block truncate text-xs leading-5 text-muted">
            {displayRole}
          </span>
        </span>

        <span className="hidden text-muted xl:block">
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close user menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_30px_rgba(8,45,110,0.12)]"
          >
            <div className="border-b border-line px-3.5 py-3">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>

              <p className="mt-0.5 truncate text-xs text-muted">
                {displayEmail}
              </p>
            </div>

            <div className="p-1.5">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-soft hover:text-brand"
              >
                Profile
              </Link>

              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-soft hover:text-brand"
              >
                Account settings
              </Link>

              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}