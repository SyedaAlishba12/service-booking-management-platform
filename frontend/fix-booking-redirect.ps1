
$ErrorActionPreference = "Stop"

$servicesPath = ".\src\app\services\page.tsx"
$providerPath = ".\src\app\providers\[providerId]\page.tsx"

# Read the existing files without interpreting square brackets as wildcards.
$services = Get-Content -Raw -LiteralPath $servicesPath
$provider = Get-Content -Raw -LiteralPath $providerPath

# Add backups before changing anything.
Copy-Item -LiteralPath $servicesPath -Destination "$servicesPath.bak" -Force
Copy-Item -LiteralPath $providerPath -Destination "$providerPath.bak" -Force

function Replace-Once {
    param(
        [string]$Content,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    if (-not $Content.Contains($Old)) {
        throw "Could not find the expected code for: $Label. No changes have been written."
    }

    return $Content.Replace($Old, $New)
}

# ---------------------------
# SERVICES PAGE
# ---------------------------

$services = Replace-Once $services `
    'import { useSearchParams } from "next/navigation";' `
    'import { useRouter, useSearchParams } from "next/navigation";' `
    "Services router import"

$services = Replace-Once $services `
    'import { apiClient } from "@/utils/api_client";' `
    'import { apiClient } from "@/utils/api_client";
import { useAuth } from "@/app/providers/AuthProvider";' `
    "Services auth import"

$services = Replace-Once $services `
    'function ServicesPageContent() {
  const searchParams = useSearchParams();' `
    'function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  function navigateToBooking(bookingPath: string) {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
      return;
    }

    router.push(bookingPath);
  }' `
    "Services booking navigation handler"

$oldServicesLink = @'
                      <Link
                        href={`/booking?provider_id=${encodeURIComponent(
                          service.provider_id,
                        )}&service_id=${encodeURIComponent(service.id)}`}
                        className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
                      >
                        Book now
                      </Link>
'@

$newServicesButton = @'
                      <button
                        type="button"
                        onClick={() =>
                          navigateToBooking(
                            `/booking?provider_id=${encodeURIComponent(
                              service.provider_id,
                            )}&service_id=${encodeURIComponent(service.id)}`
                          )
                        }
                        disabled={authLoading}
                        className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                      >
                        Book now
                      </button>
'@

$services = Replace-Once $services $oldServicesLink $newServicesButton `
    "Services card Book now button"

# ---------------------------
# PROVIDER DETAILS PAGE
# ---------------------------

$provider = Replace-Once $provider `
    'import { useParams } from "next/navigation";' `
    'import { useParams, useRouter } from "next/navigation";' `
    "Provider router import"

$provider = Replace-Once $provider `
    'import { apiClient } from "@/utils/api_client";' `
    'import { apiClient } from "@/utils/api_client";
import { useAuth } from "@/app/providers/AuthProvider";' `
    "Provider auth import"

$provider = Replace-Once $provider `
    'export default function PublicProviderProfilePage() {
  const params = useParams<{ providerId: string }>();
  const providerId = params.providerId;' `
    'export default function PublicProviderProfilePage() {
  const params = useParams<{ providerId: string }>();
  const providerId = params.providerId;
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();

  function navigateToBooking(bookingPath: string) {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
      return;
    }

    router.push(bookingPath);
  }' `
    "Provider booking navigation handler"

$oldProviderServiceLink = @'
                    <Link
                      href={`/booking?provider_id=${encodeURIComponent(provider.id)}&service_id=${encodeURIComponent(service.id)}`}
                      className="btn-primary inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      Book now
                    </Link>
'@

$newProviderServiceButton = @'
                    <button
                      type="button"
                      onClick={() =>
                        navigateToBooking(
                          `/booking?provider_id=${encodeURIComponent(provider.id)}&service_id=${encodeURIComponent(service.id)}`
                        )
                      }
                      disabled={authLoading}
                      className="btn-primary inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Book now
                    </button>
'@

$provider = Replace-Once $provider $oldProviderServiceLink $newProviderServiceButton `
    "Provider service Book now button"

$oldFindAppointmentLink = @'
                <Link
                  href={`/booking?provider_id=${encodeURIComponent(provider.id)}`}
                  className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Find an appointment
                </Link>
'@

$newFindAppointmentButton = @'
                <button
                  type="button"
                  onClick={() =>
                    navigateToBooking(
                      `/booking?provider_id=${encodeURIComponent(provider.id)}`
                    )
                  }
                  disabled={authLoading}
                  className="btn-primary mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  Find an appointment
                </button>
'@

$provider = Replace-Once $provider $oldFindAppointmentLink $newFindAppointmentButton `
    "Find an appointment button"

$oldFinalBookingLink = @'
            <Link
              href={`/booking?provider_id=${encodeURIComponent(provider.id)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand transition hover:bg-brand-soft"
            >
              Book an appointment
            </Link>
'@

$newFinalBookingButton = @'
            <button
              type="button"
              onClick={() =>
                navigateToBooking(
                  `/booking?provider_id=${encodeURIComponent(provider.id)}`
                )
              }
              disabled={authLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand transition hover:bg-brand-soft disabled:opacity-60"
            >
              Book an appointment
            </button>
'@

$provider = Replace-Once $provider $oldFinalBookingLink $newFinalBookingButton `
    "Final Book an appointment button"

# Write only after all expected replacements have succeeded.
Set-Content -LiteralPath $servicesPath -Value $services -Encoding utf8
Set-Content -LiteralPath $providerPath -Value $provider -Encoding utf8

Write-Host ""
Write-Host "Updated both pages successfully." -ForegroundColor Green
Write-Host "Backups: $servicesPath.bak and $providerPath.bak"
Write-Host "Next: check the changes and run the frontend."
