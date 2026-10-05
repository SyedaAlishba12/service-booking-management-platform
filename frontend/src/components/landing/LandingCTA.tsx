import Link from "next/link";
import Button from "../ui/Button";
import { Card } from "../ui/Card";

export default function LandingCTA() {
  return (
    <section
      id="become-provider"
      className="section scroll-mt-20"
    >
      <div className="container">
        <Card
          variant="dark"
          className="relative overflow-hidden p-7 sm:p-9"
        >
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                For professionals
              </p>

              <h2 className="mt-2 text-2xl text-white sm:text-3xl">
                Grow your service business with ServiceHub
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/65">
                Create your provider profile, list your services, manage your
                availability, and connect with customers.
              </p>
            </div>

            <Link href="/signup" className="shrink-0">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-sidebar hover:bg-white/90"
              >
                Become a Provider
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}