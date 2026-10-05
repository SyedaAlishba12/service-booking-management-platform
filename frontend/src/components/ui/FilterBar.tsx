import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  onClear?: () => void;
  showClear?: boolean;
}

export default function FilterBar({
  children,
  onClear,
  showClear = true,
}: FilterBarProps) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>

        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-md px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}