"use client";

import { useState } from "react";
import ProviderShell from "@/components/provider/ProviderShell";
import ReviewsPanel from "@/components/provider/ReviewsPanel";
import AvailabilityPanel from "@/components/provider-availability/AvailabilityPanel";
import ProviderProfileForm from "@/components/provider/ProviderProfileForm";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import { useMyProvider, useSaveProvider } from "@/hooks/useProviderProfile";
import type { ProviderPayload, ProviderStatus } from "@/types/provider";
import { getApiErrorMessage, isApiError } from "@/utils/api_error_handler";

const APPROVAL_BADGE: Record<ProviderStatus, { status: "pending" | "approved" | "rejected"; label: string }> = {
  PENDING: { status: "pending", label: "Awaiting approval" },
  APPROVED: { status: "approved", label: "Approved" },
  SUSPENDED: { status: "rejected", label: "Suspended" },
};

export default function ProviderProfilePage() {
  const provider = useMyProvider();
  const save = useSaveProvider();
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState<string | null>(null);

  // 404 = this user has no provider profile yet, so show the create form.
  const needsProfile = provider.isError && isApiError(provider.error) && provider.error.status === 404;
  const data = provider.data ?? null;

  const handleSave = (payload: ProviderPayload) => {
    setSaved(null);
    save.mutate(
      { payload, exists: !needsProfile },
      { onSuccess: () => setSaved(needsProfile ? "Profile created." : "Profile saved.") },
    );
  };

  const profileContent = (
    <div className="space-y-5">
      {saved && (
        <Alert variant="success" onClose={() => setSaved(null)}>
          {saved}
        </Alert>
      )}

      {data && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-foreground">{data.business_name}</h3>
              <p className="text-sm text-muted">{data.city ?? data.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={APPROVAL_BADGE[data.status].status}
                label={APPROVAL_BADGE[data.status].label}
              />
              {!data.is_active && <StatusBadge status="inactive" />}
            </div>
          </CardContent>
        </Card>
      )}

      {data?.status === "PENDING" && (
        <Alert variant="warning">
          Your profile is waiting for admin approval. It is hidden from customers until it is approved.
        </Alert>
      )}
      {data?.status === "SUSPENDED" && (
        <Alert variant="error">Your profile is suspended. Contact support to find out why.</Alert>
      )}

      <Card>
        <CardContent>
          <ProviderProfileForm
            provider={data}
            isSaving={save.isPending}
            errorMessage={save.isError ? getApiErrorMessage(save.error) : undefined}
            onSubmit={handleSave}
          />
        </CardContent>
      </Card>
    </div>
  );

  let body;
  if (provider.isLoading) {
    body = <LoadingState message="Loading your profile..." />;
  } else if (provider.isError && !needsProfile) {
    body = (
      <ErrorState
        message={getApiErrorMessage(provider.error)}
        action={<Button onClick={() => provider.refetch()}>Try again</Button>}
      />
    );
  } else {
    body = (
      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: "profile", label: "Profile", content: <div className="pt-5">{profileContent}</div> },
          {
            id: "availability",
            label: "Availability",
            content: (
              <div className="pt-5">
                {needsProfile ? (
                  <EmptyState
                    title="Create your profile first"
                    description="Set your business details and timezone in the Profile tab, then add your working hours."
                    action={<Button onClick={() => setTab("profile")}>Go to profile</Button>}
                  />
                ) : (
                  <AvailabilityPanel />
                )}
              </div>
            ),
          },
          {
            id: "reviews",
            label: "Reviews",
            content: (
              <div className="pt-5">
                {needsProfile ? (
                  <EmptyState
                    title="Create your profile first"
                    description="Reviews appear after customers book and complete your services."
                    action={<Button onClick={() => setTab("profile")}>Go to profile</Button>}
                  />
                ) : (
                  <ReviewsPanel />
                )}
              </div>
            ),
          },
        ]}
      />
    );
  }

  return (
    <ProviderShell
      activeHref="/dashboard/providers"
      title="Provider profile"
      description="Your business details, working hours, breaks and days off."
    >
      {body}
    </ProviderShell>
  );
}
