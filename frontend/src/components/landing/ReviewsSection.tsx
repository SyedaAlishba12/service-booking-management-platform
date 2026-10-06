import { Card } from "../ui/Card";

const reviews = [
  {
    name: "Ayesha Khan",
    role: "Customer",
    rating: "5.0",
    review:
      "Finding a reliable salon was much easier than searching through different pages. I could compare the options and book a convenient time.",
  },
  {
    name: "Hamza Ali",
    role: "Customer",
    rating: "4.8",
    review:
      "The booking process is simple and clear. I could see the provider, service, price, and appointment details before confirming.",
  },
  {
    name: "Mariam Ahmed",
    role: "Customer",
    rating: "5.0",
    review:
      "I like having everything in one place. My upcoming appointments and previous bookings are easy to manage from the dashboard.",
  },
];

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="m10 2.5 2.32 4.7 5.18.75-3.75 3.65.89 5.16L10 14.32l-4.64 2.44.89-5.16L2.5 7.95l5.18-.75L10 2.5Z" />
    </svg>
  );
}

export default function ReviewsSection() {
  return (
    <section id="reviews" className="section scroll-mt-20 bg-surface">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            Reviews
          </p>

          <h2 className="mt-2 text-2xl sm:text-3xl">
            What customers are saying
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            Real experiences help customers choose the right service and
            provider with confidence.
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <Card
              key={review.name}
              variant="default"
              className="p-5"
            >
              <div className="flex items-center gap-1 text-warning">
                {Array.from({ length: 5 }).map((_, index) => (
                  <StarIcon key={index} />
                ))}
              </div>

              <p className="mt-5 text-sm leading-6 text-foreground/80">
                “{review.review}”
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar text-xs font-bold text-white">
                  {review.name.charAt(0)}
                </div>

                <div>
                  <p className="text-sm font-bold">{review.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {review.role}
                    </span>

                    <span className="text-xs font-semibold text-success">
                      {review.rating}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}