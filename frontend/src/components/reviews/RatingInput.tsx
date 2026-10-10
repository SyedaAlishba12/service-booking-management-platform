/**
 * @file RatingInput.tsx
 * @description Accessible interactive 1 to 5 star selector
 */

import { useState } from "react";

export interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function RatingInput({ value, onChange, disabled }: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating input">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => !disabled && setHoverValue(null)}
          className={`text-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm ${
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          } ${star <= displayValue ? "text-warning" : "text-muted"}`}
          aria-label={`Rate ${star} out of 5 stars`}
          aria-pressed={value === star}
        >
          {star <= displayValue ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
