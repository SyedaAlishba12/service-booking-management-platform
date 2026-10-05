import type { ReactNode } from "react";

type AlertVariant =
  | "success"
  | "error"
  | "warning"
  | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

const variantClasses: Record<AlertVariant, string> = {
  success:
    "border-success/20 bg-success-soft text-success",
  error:
    "border-danger/20 bg-danger-soft text-danger",
  warning:
    "border-warning/20 bg-warning-soft text-warning",
  info:
    "border-info/20 bg-info-soft text-info",
};

export default function Alert({
  variant = "info",
  title,
  children,
  onClose,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3.5",
        variantClasses[variant],
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        {title && (
          <p className="font-semibold">
            {title}
          </p>
        )}

        <div
          className={[
            "text-sm",
            title ? "mt-1" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alert"
          className="rounded-md px-1 text-current opacity-60 transition hover:bg-black/5 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}