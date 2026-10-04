function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const steps = [
  {
    number: "01",
    title: "Search",
    description: "Tell us what service you need.",
  },
  {
    number: "02",
    title: "Compare",
    description: "Check providers, prices, and ratings.",
  },
  {
    number: "03",
    title: "Choose",
    description: "Pick a time that works for you.",
  },
  {
    number: "04",
    title: "Book",
    description: "Confirm your appointment.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section scroll-mt-20 bg-surface"
    >
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            Simple workflow
          </p>

          <h2 className="mt-2 text-2xl sm:text-3xl">
            From search to booking
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            No complicated process. Find a service, choose a provider, select
            your time, and book.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative rounded-2xl border border-line bg-background p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-brand">
                  {step.number}
                </span>

                {index < steps.length - 1 && (
                  <span className="hidden text-muted md:block">
                    <ArrowIcon />
                  </span>
                )}
              </div>

              <h3 className="mt-6 text-base font-bold">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-5 text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}