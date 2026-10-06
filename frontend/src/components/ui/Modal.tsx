"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={
          description ? descriptionId : undefined
        }
        className={[
          "w-full overflow-hidden rounded-3xl bg-surface",
          "shadow-[0_20px_60px_rgba(8,45,110,0.18)]",
          sizeClasses[size],
        ].join(" ")}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-bold tracking-tight text-foreground"
                >
                  {title}
                </h2>
              )}

              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm leading-5 text-muted"
                >
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg leading-none text-muted transition-colors hover:bg-brand-soft hover:text-brand"
            >
              ×
            </button>
          </div>
        )}

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}