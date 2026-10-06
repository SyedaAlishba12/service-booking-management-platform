import type { HTMLAttributes } from "react";

type CardVariant = "default" | "glass" | "dark";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    "rounded-3xl border border-transparent bg-white shadow-[0_8px_30px_rgba(8,45,110,0.07)] text-foreground",

  glass:
    "rounded-3xl border border-white/70 bg-white/60 shadow-[0_8px_30px_rgba(8,45,110,0.07)] backdrop-blur-xl text-foreground",

  dark:
    "rounded-3xl border border-transparent bg-sidebar text-white shadow-[0_8px_30px_rgba(8,45,110,0.07)]",
};

export function Card({
  variant = "default",
  hover = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        variantClasses[variant],
        hover ? "card-hover" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function CardHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "border-b border-line px-4 py-3.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function CardContent({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["p-4", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function CardFooter({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "border-t border-line bg-surface-blue px-4 py-3.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}