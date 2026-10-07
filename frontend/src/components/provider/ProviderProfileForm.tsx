"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import type { Provider, ProviderPayload } from "@/types/provider";

// Mirrors backend schemas/provider.py. Backend validation still applies.
function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const schema = z.object({
  business_name: z.string().trim().min(2, "At least 2 characters").max(150),
  description: z.string().max(2000),
  location: z.string().trim().min(2, "At least 2 characters").max(255),
  city: z.string().max(100),
  contact_phone: z.string().max(30),
  contact_email: z
    .string()
    .max(255)
    .refine((v) => v.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()), "Invalid email address"),
  timezone: z.string().refine(isValidTimezone, "Use an IANA name, e.g. Asia/Karachi"),
  slot_interval_minutes: z
    .string()
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) <= 480, "Enter 1 to 480 minutes"),
  buffer_minutes: z
    .string()
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 240, "Enter 0 to 240 minutes"),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  business_name: "",
  description: "",
  location: "",
  city: "",
  contact_phone: "",
  contact_email: "",
  timezone: "Asia/Karachi",
  slot_interval_minutes: "30",
  buffer_minutes: "0",
};

interface Props {
  provider: Provider | null; // null = create a new profile
  isSaving: boolean;
  errorMessage?: string;
  onSubmit: (payload: ProviderPayload) => void;
}

export default function ProviderProfileForm({ provider, isSaving, errorMessage, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    reset(
      provider
        ? {
            business_name: provider.business_name,
            description: provider.description ?? "",
            location: provider.location,
            city: provider.city ?? "",
            contact_phone: provider.contact_phone ?? "",
            contact_email: provider.contact_email ?? "",
            timezone: provider.timezone,
            slot_interval_minutes: String(provider.slot_interval_minutes),
            buffer_minutes: String(provider.buffer_minutes),
          }
        : EMPTY,
    );
  }, [provider, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      business_name: v.business_name.trim(),
      description: v.description.trim() || null,
      location: v.location.trim(),
      city: v.city.trim() || null,
      contact_phone: v.contact_phone.trim() || null,
      contact_email: v.contact_email.trim() || null,
      timezone: v.timezone.trim(),
      slot_interval_minutes: Number(v.slot_interval_minutes),
      buffer_minutes: Number(v.buffer_minutes),
    }),
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

      <Input label="Business name" error={errors.business_name?.message} {...register("business_name")} />
      <Textarea label="Description (optional)" error={errors.description?.message} {...register("description")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Location / address" error={errors.location?.message} {...register("location")} />
        <Input label="City (optional)" error={errors.city?.message} {...register("city")} />
        <Input label="Contact phone (optional)" error={errors.contact_phone?.message} {...register("contact_phone")} />
        <Input label="Contact email (optional)" error={errors.contact_email?.message} {...register("contact_email")} />
      </div>

      <div className="rounded-2xl border border-line bg-surface-blue p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Scheduling</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Timezone"
            hint="Your working hours use this timezone."
            error={errors.timezone?.message}
            {...register("timezone")}
          />
          <Input
            label="Slot interval (min)"
            hint="Gap between bookable start times."
            inputMode="numeric"
            error={errors.slot_interval_minutes?.message}
            {...register("slot_interval_minutes")}
          />
          <Input
            label="Buffer (min)"
            hint="Rest time between bookings."
            inputMode="numeric"
            error={errors.buffer_minutes?.message}
            {...register("buffer_minutes")}
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSaving || (!!provider && !isDirty)}>
          {isSaving ? "Saving..." : provider ? "Save changes" : "Create profile"}
        </Button>
      </div>
    </form>
  );
}
