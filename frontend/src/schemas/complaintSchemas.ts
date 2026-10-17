import { z } from "zod";

const uuid = z.string().uuid("Must be a valid UUID.");

export const complaintFormSchema = z
  .object({
    complaint_type: z.enum(["BOOKING", "PROVIDER", "PAYMENT", "PLATFORM", "OTHER"]),
    subject: z.string().trim().min(1, "Subject is required.").max(200, "Subject cannot exceed 200 characters."),
    description: z.string().trim().min(1, "Description is required.").max(5000, "Description cannot exceed 5000 characters."),
    booking_id: z.string(),
    provider_id: z.string(),
  })
  .superRefine((value, ctx) => {
    if ((value.complaint_type === "BOOKING" || value.complaint_type === "PAYMENT") && !value.booking_id) {
      ctx.addIssue({ code: "custom", path: ["booking_id"], message: "Booking ID is required for this complaint type." });
    }
    if ((value.complaint_type === "BOOKING" || value.complaint_type === "PAYMENT") && value.booking_id && !uuid.safeParse(value.booking_id).success) {
      ctx.addIssue({ code: "custom", path: ["booking_id"], message: "Must be a valid UUID." });
    }
    if (value.complaint_type === "PROVIDER" && !value.provider_id) {
      ctx.addIssue({ code: "custom", path: ["provider_id"], message: "Provider ID is required for this complaint type." });
    }
    if (value.complaint_type === "PROVIDER" && value.provider_id && !uuid.safeParse(value.provider_id).success) {
      ctx.addIssue({ code: "custom", path: ["provider_id"], message: "Must be a valid UUID." });
    }
  });

export type ComplaintFormValues = z.infer<typeof complaintFormSchema>;
