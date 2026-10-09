"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";

import {
  signupSchema,
  type SignupFormData,
} from "@/schemas/authSchemas";

import { useAuth } from "@/app/providers/AuthProvider";
import { getApiErrorMessage } from "@/utils/api_error_handler";

const roleOptions = [
  { label: "Customer", value: "CUSTOMER" },
  { label: "Service Provider", value: "PROVIDER" },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
      role: "CUSTOMER",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError("");
    setSubmitting(true);

    try {
      await signup({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        role: data.role,
      });

      // Account created: ask the user to sign in.
      router.replace("/login?registered=1");
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, "Unable to create your account.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-blue px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link
          href="/landing"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </Link>

        <div className="rounded-3xl bg-surface p-6 shadow-[0_12px_40px_rgba(8,45,110,0.10)] sm:p-8">
          <div className="mb-7 text-center">
            <Link
              href="/landing"
              className="text-2xl font-bold text-foreground"
            >
              ServiceHub
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-foreground">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-muted">
              Join ServiceHub and start managing your services.
            </p>
          </div>

          {serverError && (
            <div className="mb-5">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="full_name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Full name"
                  placeholder="Your full name"
                  autoComplete="name"
                  error={errors.full_name?.message}
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="tel"
                  label="Phone"
                  placeholder="Optional"
                  autoComplete="tel"
                  error={errors.phone?.message}
                />
              )}
            />

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Account type"
                  options={roleOptions}
                  error={errors.role?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    error={errors.password?.message}
                    className="pr-11"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-[42px] -translate-y-1/2 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                  >
                    {showPassword ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            />

            <Controller
              name="confirm_password"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showConfirmPassword ? "text" : "password"}
                    label="Confirm password"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    error={errors.confirm_password?.message}
                    className="pr-11"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((previous) => !previous)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                    className="absolute right-3 top-[42px] -translate-y-1/2 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}