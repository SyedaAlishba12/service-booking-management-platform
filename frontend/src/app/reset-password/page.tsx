"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/schemas/authSchemas";

import { apiClient } from "@/utils/api_client";
import { getApiErrorMessage } from "@/utils/api_error_handler";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => {
      router.replace("/login");
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [success, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setServerError(
        "This password reset link is invalid or incomplete. Request a new reset link."
      );
      return;
    }

    setServerError("");

    try {
      await apiClient.post("/api/auth/reset-password", {
        token,
        new_password: data.password,
      });

      setSuccess(true);
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          "Unable to reset your password. The link may have expired."
        )
      );
    }
  };

  return (
    <main className="min-h-screen bg-surface-blue px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link
          href="/login"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <span aria-hidden="true">←</span>
          Back to Login
        </Link>

        <div className="w-full rounded-3xl bg-surface p-6 shadow-[0_12px_40px_rgba(8,45,110,0.10)] sm:p-8">
          <div className="text-center">
            <Link
              href="/landing"
              className="text-2xl font-bold text-foreground"
            >
              ServiceHub
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-foreground">
              Reset your password
            </h1>

            <p className="mt-2 text-sm text-muted">
              Choose a new password for your account.
            </p>
          </div>

          {success ? (
            <div className="mt-7 space-y-4">
              <Alert variant="success" title="Password updated">
                Your password has been reset successfully. Redirecting you to
                sign in...
              </Alert>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-7 space-y-4"
            >
              {!token && (
                <Alert variant="error">
                  This reset link is missing its token. Please request a new
                  password reset link.
                </Alert>
              )}

              {serverError && (
                <Alert variant="error">{serverError}</Alert>
              )}

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      label="New password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      error={errors.password?.message}
                      className="pr-11"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={
                        showPassword ? "Hide new password" : "Show new password"
                      }
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
                disabled={isSubmitting || !token}
              >
                {isSubmitting ? "Updating..." : "Reset password"}
              </Button>

              <p className="text-center text-sm text-muted">
                Want to sign in instead?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-brand hover:underline"
                >
                  Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}