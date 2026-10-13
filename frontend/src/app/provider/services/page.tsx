import { redirect } from "next/navigation";

// Task-doc route: services are managed on the provider dashboard services page.
export default function ProviderServicesRedirect() {
  redirect("/dashboard/services");
}
