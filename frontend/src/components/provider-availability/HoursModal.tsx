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
import { DAY_LABELS } from "@/constants/provider";
import type { AvailabilityPayload } from "@/types/provider";

const schema = z
  .object({
    day_of_week: z.string(),
    kind: z.enum(["WORK", "BREAK"]),
    start_time: z.string().min(1, "Choose a start time"),
    end_time: z.string().min(1, "Choose an end time"),
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time > v.start_time, {
    path: ["end_time"],
    message: "End time must be after start time",
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDay: number;
  isSaving: boolean;
  errorMessage?: string;
  onSubmit: (payload: AvailabilityPayload) => void;
}

export default function HoursModal({ open, onClose, defaultDay, isSaving, errorMessage, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ day_of_week: String(defaultDay), kind: "WORK", start_time: "09:00", end_time: "17:00" });
    }
  }, [open, defaultDay, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      day_of_week: Number(v.day_of_week),
      start_time: v.start_time,
      end_time: v.end_time,
      is_break: v.kind === "BREAK",
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add working hours or break"
      description="Times are in your provider timezone. You can add several windows per day."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Day"
            options={DAY_LABELS.map((label, i) => ({ label, value: String(i) }))}
            error={errors.day_of_week?.message}
            {...register("day_of_week")}
          />
          <Select
            label="Type"
            options={[
              { label: "Working hours", value: "WORK" },
              { label: "Break", value: "BREAK" },
            ]}
            error={errors.kind?.message}
            {...register("kind")}
          />
          <Input label="From" type="time" error={errors.start_time?.message} {...register("start_time")} />
          <Input label="To" type="time" error={errors.end_time?.message} {...register("end_time")} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
