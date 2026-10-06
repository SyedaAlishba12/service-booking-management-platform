"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { SERVICE_TYPE_OPTIONS } from "@/constants/provider";
import type { CategoryOption, ProviderService, ServicePayload } from "@/types/provider";

// Rules mirror the backend (schemas/service.py). Backend validation still applies.
const schema = z.object({
  category_id: z.string().min(1, "Select a category"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
  description: z.string().max(2000),
  price: z
    .string()
    .refine((v) => v.trim() !== "" && Number(v) >= 0, "Enter a valid price")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), "Use up to 2 decimal places"),
  duration_minutes: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) <= 1440,
      "Enter minutes between 1 and 1440",
    ),
  service_type: z.enum(["ON_SITE", "AT_PROVIDER", "ONLINE"]),
  location: z.string().max(255),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  category_id: "",
  name: "",
  description: "",
  price: "",
  duration_minutes: "30",
  service_type: "AT_PROVIDER",
  location: "",
};

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  service: ProviderService | null; // null = add new
  categories: CategoryOption[];
  isSaving: boolean;
  errorMessage?: string;
  onSubmit: (payload: ServicePayload) => void;
}

export default function ServiceFormModal({
  open,
  onClose,
  service,
  categories,
  isSaving,
  errorMessage,
  onSubmit,
}: ServiceFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      service
        ? {
            category_id: service.category_id,
            name: service.name,
            description: service.description ?? "",
            price: service.price,
            duration_minutes: String(service.duration_minutes),
            service_type: service.service_type,
            location: service.location ?? "",
          }
        : EMPTY,
    );
  }, [open, service, reset]);

  const submit = handleSubmit((values) =>
    onSubmit({
      category_id: values.category_id,
      name: values.name.trim(),
      description: values.description.trim() || null,
      price: values.price.trim(),
      duration_minutes: Number(values.duration_minutes),
      service_type: values.service_type,
      location: values.location.trim() || null,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={service ? "Edit service" : "Add service"}
      description="Customers see this on your profile and in search."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <Input label="Service name" error={errors.name?.message} {...register("name")} />

        <Select
          label="Category"
          placeholder="Select a category"
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
          error={errors.category_id?.message}
          {...register("category_id")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price"
            inputMode="decimal"
            placeholder="1500"
            error={errors.price?.message}
            {...register("price")}
          />
          <Input
            label="Duration (minutes)"
            inputMode="numeric"
            error={errors.duration_minutes?.message}
            {...register("duration_minutes")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Service type"
            options={SERVICE_TYPE_OPTIONS}
            error={errors.service_type?.message}
            {...register("service_type")}
          />
          <Input
            label="Location (optional)"
            error={errors.location?.message}
            {...register("location")}
          />
        </div>

        <Textarea
          label="Description (optional)"
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : service ? "Save changes" : "Add service"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
