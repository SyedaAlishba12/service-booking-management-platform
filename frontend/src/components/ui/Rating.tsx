interface RatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export default function Rating({
  value,
  count,
  size = "md",
  showValue = true,
}: RatingProps) {
  const normalizedValue = Math.max(
    0,
    Math.min(5, value),
  );

  const roundedValue = Math.round(normalizedValue);

  return (
    <div
      className={[
        "flex items-center gap-1.5",
        sizeClasses[size],
      ].join(" ")}
      aria-label={`Rating ${normalizedValue.toFixed(1)} out of 5`}
    >
      <div
        aria-hidden="true"
        className="flex tracking-tight text-warning"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= roundedValue ? "★" : "☆"}
          </span>
        ))}
      </div>

      {showValue && (
        <span className="font-semibold text-foreground">
          {normalizedValue.toFixed(1)}
        </span>
      )}

      {typeof count === "number" && (
        <span className="text-muted">
          ({count})
        </span>
      )}
    </div>
  );
}