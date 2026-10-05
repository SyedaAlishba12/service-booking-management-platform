"use client";

import { useState } from "react";

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
  userName = "Ali",
  userEmail = "ali@example.com",
  role = "Customer",
}: UserMenuProps) {
  const [open, setOpen] = useState(false);

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
          {userName.charAt(0).toUpperCase()}
        </span>

        <span className="hidden max-w-[120px] text-left xl:block">
          <span className="block truncate text-sm font-semibold leading-5 text-foreground">
            {userName}
          </span>

          <span className="block truncate text-xs leading-5 text-muted">
            {role}
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
                {userName}
              </p>

              <p className="mt-0.5 truncate text-xs text-muted">
                {userEmail}
              </p>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-soft hover:text-brand"
                onClick={() => setOpen(false)}
              >
                Profile
              </button>

              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-brand-soft hover:text-brand"
                onClick={() => setOpen(false)}
              >
                Settings
              </button>

              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                onClick={() => setOpen(false)}
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