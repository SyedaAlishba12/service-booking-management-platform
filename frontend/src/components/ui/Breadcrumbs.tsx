import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
    >
      <path
        d="M6 3.5L10 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Breadcrumbs({
  items,
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto text-sm"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div
            key={`${item.label}-${index}`}
            className="flex shrink-0 items-center gap-1.5"
          >
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-muted transition-colors hover:text-brand"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "font-semibold text-foreground"
                    : "text-muted"
                }
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <span
                aria-hidden="true"
                className="text-line"
              >
                <ChevronIcon />
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}