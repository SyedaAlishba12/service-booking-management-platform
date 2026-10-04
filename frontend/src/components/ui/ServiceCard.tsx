import Link from "next/link";
import { Card } from "./Card";
import Rating from "./Rating";

interface ServiceCardProps {
  id: string;
  name: string;
  providerName: string;
  category?: string;
  description?: string;
  price: number;
  duration?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  href?: string;
}

export default function ServiceCard({
  id,
  name,
  providerName,
  category,
  description,
  price,
  duration,
  rating = 0,
  reviewCount = 0,
  imageUrl,
  href = `/services/${id}`,
}: ServiceCardProps) {
  return (
    <Card hover className="overflow-hidden">
      <div className="aspect-[16/9] overflow-hidden bg-brand-soft">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-bold text-brand">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="p-4">
        {category && (
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            {category}
          </p>
        )}

        <h3 className="mt-1.5 text-lg font-bold tracking-tight text-foreground">
          {name}
        </h3>

        <p className="mt-1 text-sm font-medium text-muted">
          by {providerName}
        </p>

        {description && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-5 text-muted">
            {description}
          </p>
        )}

        <div className="mt-3">
          <Rating
            value={rating}
            count={reviewCount}
            size="sm"
          />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-brand">
              PKR {price.toLocaleString()}
            </p>

            {typeof duration === "number" && (
              <p className="mt-0.5 text-xs text-muted">
                {duration} min
              </p>
            )}
          </div>

          <Link
            href={href}
            className="btn-primary inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-all"
          >
            <span>View Service</span>

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
      </div>
    </Card>
  );
}