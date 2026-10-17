import { z } from "zod";

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1, "Please select a rating.").max(5),
  comment: z.string().max(2000, "Comment cannot exceed 2000 characters."),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
