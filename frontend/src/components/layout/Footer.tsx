import Link from "next/link";

const serviceLinks = [
  { label: "All Services", href: "/services" },
  { label: "Categories", href: "/categories" },
  { label: "Providers", href: "/providers" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Become a Provider", href: "/become-provider" },
  { label: "Contact", href: "/contact" },
];

const supportLinks = [
  { label: "FAQ", href: "/faq" },
  { label: "Help Center", href: "/help" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-brand-dark text-text-on-blue">
      <div className="container section-sm">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-text-on-blue"
            >
              ServiceHub
            </Link>

            <p className="mt-3 max-w-sm text-sm leading-6 text-text-on-blue/75">
              Discover trusted service providers, compare
              services, and book appointments with ease.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-on-blue">
              Services
            </h3>

            <ul className="mt-3 space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-on-blue/75 transition-colors hover:text-text-on-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-on-blue">
              Company
            </h3>

            <ul className="mt-3 space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-on-blue/75 transition-colors hover:text-text-on-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-on-blue">
              Support
            </h3>

            <ul className="mt-3 space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-on-blue/75 transition-colors hover:text-text-on-blue"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-text-on-blue/15 pt-5">
          <p className="text-sm text-text-on-blue/65">
            © {new Date().getFullYear()} ServiceHub. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}