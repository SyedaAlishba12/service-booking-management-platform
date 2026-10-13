import { redirect } from "next/navigation";

// Task-doc route: availability is the "Availability" tab of the provider page.
export default function ProviderAvailabilityRedirect() {
  redirect("/dashboard/providers");
}
