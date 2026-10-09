import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required."),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters.")
      .max(150, "Full name cannot exceed 150 characters."),

    email: z
      .string()
      .email("Please enter a valid email address."),

    phone: z
      .string()
      .max(20, "Phone number cannot exceed 20 characters.")
      .optional()
      .or(z.literal("")),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password cannot exceed 128 characters."),

    confirm_password: z
      .string()
      .min(1, "Please confirm your password."),

    role: z.enum(["CUSTOMER", "PROVIDER"]),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address."),
});

export type ForgotPasswordFormData = z.infer<
  typeof forgotPasswordSchema
>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password cannot exceed 128 characters."),

    confirm_password: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type ResetPasswordFormData = z.infer<
  typeof resetPasswordSchema
>;

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters.")
    .max(150, "Full name cannot exceed 150 characters."),

  phone: z
    .string()
    .max(20, "Phone number cannot exceed 20 characters.")
    .optional()
    .or(z.literal("")),

  profile_image_url: z
    .string()
    .max(500, "Profile image URL cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;