const faqs = [
  {
    question: "What is ServiceHub?",
    answer:
      "ServiceHub is a service booking platform where customers can discover services, compare providers, choose available appointment times, and manage their bookings from one place.",
  },
  {
    question: "How do I book a service?",
    answer:
      "Search for the service you need, choose a provider, select an available date and time, enter your details, and confirm your booking.",
  },
  {
    question: "Can I compare different providers?",
    answer:
      "Yes. Provider information can include services, prices, ratings, reviews, location, and availability so you can make a more informed choice.",
  },
  {
    question: "Can service providers join ServiceHub?",
    answer:
      "Yes. Professionals can create a provider profile, list their services, manage availability, and receive bookings from customers.",
  },
  {
    question: "Can I manage my bookings after booking?",
    answer:
      "Yes. Your dashboard provides a central place to view upcoming appointments, booking activity, and your service history.",
  },
];

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-5 w-5 shrink-0"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FAQSection() {
  return (
    <section id="faq" className="section scroll-mt-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            FAQ
          </p>

          <h2 className="mt-2 text-2xl sm:text-3xl">
            Frequently asked questions
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            A few quick answers about finding services, providers, and
            managing bookings.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-white">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-5 text-left font-semibold [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>

                <span className="text-muted transition-transform duration-200 group-open:rotate-45">
                  <PlusIcon />
                </span>
              </summary>

              <div className="px-5 pb-5 pr-14 text-sm leading-6 text-muted">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}