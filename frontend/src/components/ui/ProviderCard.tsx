import Link from "next/link";
import { Card } from "./Card";
import Rating from "./Rating";

interface ProviderCardProps {
  id: string;
  name: string;
  category?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  serviceCount?: number;
  imageUrl?: string;
  href?: string;
}

export default function ProviderCard({
  id,
  name,
  category,
  location,
  rating = 0,
  reviewCount = 0,
  serviceCount,
  imageUrl,
  href = `/providers/${id}`,
}: ProviderCardProps) {
  return (
    <Card hover className="overflow-hidden">
      <div className="aspect-[16/9] overflow-hidden bg-brand-soft">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-bold text-brand">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold tracking-tight text-foreground">
            {name}
          </h3>

          {category && (
            <p className="mt-1 text-sm font-semibold text-brand">
              {category}
            </p>
          )}
        </div>

        {location && (
          <p className="mt-2.5 text-sm text-muted">
            {location}
          </p>
        )}

        <div className="mt-2.5">
          <Rating
            value={rating}
            count={reviewCount}
            size="sm"
          />
        </div>

        {typeof serviceCount === "number" && (
          <p className="mt-1.5 text-sm text-muted">
            {serviceCount} service
            {serviceCount === 1 ? "" : "s"}
          </p>
        )}

        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand transition-all hover:gap-3"
        >
          <span>View Provider</span>

          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
          >
            <path
              d="M7.5 4.5L13 10L7.5 15.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </Card>
  );
}