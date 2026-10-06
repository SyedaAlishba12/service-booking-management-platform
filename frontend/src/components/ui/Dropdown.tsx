"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export interface DropdownItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export default function Dropdown({
  trigger,
  items,
  align = "right",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={[
            "absolute z-30 mt-2 min-w-48 overflow-hidden rounded-xl",
            "border border-line bg-surface py-1",
            "shadow-[0_12px_30px_rgba(8,45,110,0.12)]",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={[
                "block w-full px-3.5 py-2.5 text-left text-sm font-medium",
                "transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-40",
                item.danger
                  ? "text-danger hover:bg-danger-soft"
                  : "text-foreground hover:bg-brand-soft hover:text-brand",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}