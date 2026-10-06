"use client";

import { useMemo, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import StatusBadge from "@/components/ui/StatusBadge";
import ProviderShell from "@/components/provider/ProviderShell";
import ServiceFormModal from "@/components/provider-services/ServiceFormModal";
import { CURRENCY, SERVICE_TYPE_LABELS } from "@/constants/provider";
import {
  useCategories,
  useMyServices,
  useSaveService,
  useSetServiceActive,
} from "@/hooks/useProviderServices";
import type { ProviderService, ServicePayload } from "@/types/provider";
import { getApiErrorMessage } from "@/utils/api_error_handler";

interface Notice {
  variant: "success" | "error";
  message: string;
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(Number(price));
}

export default function ProviderServicesPage() {
  const services = useMyServices();
  const categories = useCategories();
  const save = useSaveService();
  const setActive = useSetServiceActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderService | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );

  const openAdd = () => {
    setEditing(null);
    save.reset();
    setModalOpen(true);
  };

  const openEdit = (service: ProviderService) => {
    setEditing(service);
    save.reset();
    setModalOpen(true);
  };

  const handleSave = (payload: ServicePayload) => {
    save.mutate(
      { id: editing?.id, payload },
      {
        onSuccess: () => {
          setModalOpen(false);
          setNotice({
            variant: "success",
            message: editing ? "Service updated." : "Service added.",
          });
        },
      },
    );
  };

  const handleToggle = (service: ProviderService) => {
    const next = !service.is_active;
    setActive.mutate(
      { id: service.id, is_active: next },
      {
        onSuccess: () =>
          setNotice({
            variant: "success",
            message: next
              ? `"${service.name}" is active again.`
              : `"${service.name}" is deactivated. It is hidden from search and cannot be booked.`,
          }),
        onError: (error) =>
          setNotice({ variant: "error", message: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <ProviderShell
      activeHref="/dashboard/services"
      title="Services"
      description="Manage what you offer, your prices and durations."
      actions={<Button onClick={openAdd}>Add service</Button>}
    >
      <div className="space-y-5">
        {notice && (
          <Alert variant={notice.variant} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}

        {services.isLoading && <LoadingState message="Loading your services..." />}

        {services.isError && (
          <ErrorState
            message={getApiErrorMessage(services.error)}
            action={<Button onClick={() => services.refetch()}>Try again</Button>}
          />
        )}

        {services.data && services.data.length === 0 && (
          <EmptyState
            title="No services yet"
            description="Add your first service so customers can find and book you."
            action={<Button onClick={openAdd}>Add service</Button>}
          />
        )}

        {services.data && services.data.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {services.data.map((service) => (
              <Card key={service.id} hover>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground">
                        {service.name}
                      </h3>
                      <p className="text-sm text-muted">
                        {categoryName.get(service.category_id) ?? "Uncategorised"} ·{" "}
                        {SERVICE_TYPE_LABELS[service.service_type]}
                      </p>
                    </div>
                    <StatusBadge status={service.is_active ? "active" : "inactive"} />
                  </div>

                  {service.description && (
                    <p className="line-clamp-2 text-sm text-muted">{service.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <span className="font-semibold text-foreground">
                      {formatPrice(service.price)}
                    </span>
                    <span className="text-muted">{service.duration_minutes} min</span>
                    {service.location && <span className="text-muted">{service.location}</span>}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(service)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={service.is_active ? "danger" : "secondary"}
                      disabled={setActive.isPending}
                      onClick={() => handleToggle(service)}
                    >
                      {service.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        service={editing}
        categories={categories.data ?? []}
        isSaving={save.isPending}
        errorMessage={save.isError ? getApiErrorMessage(save.error) : undefined}
        onSubmit={handleSave}
      />
    </ProviderShell>
  );
}
