"use client";

import type { ChangeEvent } from "react";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
}

export default function DatePicker({
  value = "",
  onChange,
  min,
  max,
  label = "Date",
  error,
  hint,
  id = "date-picker",
  disabled = false,
}: DatePickerProps) {
  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    onChange(event.target.value);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-semibold text-foreground"
        >
          {label}
        </label>
      )}

      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={handleChange}
        className={[
          "input min-h-10",
          "disabled:cursor-not-allowed disabled:bg-background disabled:opacity-60",
          error
            ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--danger-soft)]"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {error ? (
        <p className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}