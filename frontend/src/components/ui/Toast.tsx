"use client";

import type { ReactNode } from "react";

type ToastVariant =
  | "success"
  | "error"
  | "warning"
  | "info";

interface ToastProps {
  open: boolean;
  onClose?: () => void;
  variant?: ToastVariant;
  title?: string;
  message: string;
  action?: ReactNode;
}

const dotClasses: Record<ToastVariant, string> = {
  success: "bg-success",
  error: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

export default function Toast({
  open,
  onClose,
  variant = "info",
  title,
  message,
  action,
}: ToastProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex w-full max-w-sm items-start gap-3",
        "rounded-xl border border-line bg-surface",
        "p-4 shadow-lg",
      ].join(" ")}
    >
      <div
        className={[
          "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
          dotClasses[variant],
        ].join(" ")}
      />

      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-semibold text-foreground">
            {title}
          </p>
        )}

        <p
          className={[
            "text-sm text-muted",
            title ? "mt-0.5" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {message}
        </p>

        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="rounded-md px-1 text-muted transition hover:bg-brand-soft hover:text-brand"
        >
          ×
        </button>
      )}
    </div>
  );
}