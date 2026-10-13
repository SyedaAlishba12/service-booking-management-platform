import { redirect } from "next/navigation";

// Task-doc route: the provider profile is the "Profile" tab of the provider page.
export default function ProviderProfileRedirect() {
  redirect("/dashboard/providers");
}
