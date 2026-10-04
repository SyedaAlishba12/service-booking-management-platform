"use client";

import Button from "./Button";

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  times: string[];
  label?: string;
  error?: string;
}

export default function TimePicker({
  value = "",
  onChange,
  times,
  label = "Available Time",
  error,
}: TimePickerProps) {
  return (
    <div className="w-full">
      {label && (
        <p className="mb-2 text-sm font-semibold text-foreground">
          {label}
        </p>
      )}

      {times.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-blue px-4 py-3.5 text-sm text-muted">
          No available times for this date.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {times.map((time) => {
            const selected = value === time;

            return (
              <Button
                key={time}
                type="button"
                variant={selected ? "primary" : "outline"}
                size="sm"
                shape="rounded"
                aria-pressed={selected}
                onClick={() => onChange(time)}
                className="min-h-10"
              >
                {time}
              </Button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}