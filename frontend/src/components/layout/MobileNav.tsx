"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function MobileNav({
  open,
  onClose,
  children,
}: MobileNavProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      <button
        type="button"
        aria-label="Close mobile navigation"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/50"
      />

      <div className="absolute inset-y-0 right-0 w-[min(85vw,360px)] overflow-y-auto bg-surface shadow-[0_0_40px_rgba(8,45,110,0.15)]">
        <div className="flex min-h-[var(--header-height)] items-center justify-between border-b border-line px-5">
          <span className="text-lg font-bold text-brand">
            Menu
          </span>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}