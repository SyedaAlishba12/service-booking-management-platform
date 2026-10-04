import type { ReactNode } from "react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this information. Please try again.",
  action,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger-soft px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger text-sm font-bold text-white">
        !
      </div>

      <h3 className="mt-3.5 text-lg font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-sm leading-5 text-muted">
        {message}
      </p>

      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}