"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import type { ExceptionPayload } from "@/types/provider";

const schema = z
  .object({
    exception_date: z.string().min(1, "Choose a date"),
    kind: z.enum(["DAY_OFF", "CUSTOM"]),
    start_time: z.string(),
    end_time: z.string(),
    reason: z.string().max(255),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "CUSTOM") return;
    if (!v.start_time) ctx.addIssue({ code: "custom", path: ["start_time"], message: "Choose a start time" });
    if (!v.end_time) ctx.addIssue({ code: "custom", path: ["end_time"], message: "Choose an end time" });
    if (v.start_time && v.end_time && v.end_time <= v.start_time) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "End time must be after start time" });
    }
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  errorMessage?: string;
  onSubmit: (payload: ExceptionPayload) => void;
}

export default function ExceptionModal({ open, onClose, isSaving, errorMessage, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const kind = useWatch({ control, name: "kind" });

  useEffect(() => {
    if (open) reset({ exception_date: "", kind: "DAY_OFF", start_time: "", end_time: "", reason: "" });
  }, [open, reset]);

  const submit = handleSubmit((v) =>
    onSubmit({
      exception_date: v.exception_date,
      is_day_off: v.kind === "DAY_OFF",
      start_time: v.kind === "CUSTOM" ? v.start_time : null,
      end_time: v.kind === "CUSTOM" ? v.end_time : null,
      reason: v.reason.trim() || null,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add day off or special hours"
      description="Applies to one date only. It replaces your weekly hours for that day."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" error={errors.exception_date?.message} {...register("exception_date")} />
          <Select
            label="Type"
            options={[
              { label: "Day off / holiday", value: "DAY_OFF" },
              { label: "Special hours", value: "CUSTOM" },
            ]}
            {...register("kind")}
          />
          {kind === "CUSTOM" && (
            <>
              <Input label="From" type="time" error={errors.start_time?.message} {...register("start_time")} />
              <Input label="To" type="time" error={errors.end_time?.message} {...register("end_time")} />
            </>
          )}
        </div>

        <Input label="Reason (optional)" error={errors.reason?.message} {...register("reason")} />

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
