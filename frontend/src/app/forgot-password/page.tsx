"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/schemas/authSchemas";

import { apiClient } from "@/utils/api_client";
import { getApiErrorMessage } from "@/utils/api_error_handler";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError("");

    try {
      await apiClient.post("/api/auth/forgot-password", {
        email: data.email,
      });

      setSent(true);
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, "Unable to process your request.")
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
              Forgot password?
            </h1>

            <p className="mt-2 text-sm text-muted">
              Enter your email and we&apos;ll send you a password reset link.
            </p>
          </div>

          {sent ? (
            <div className="mt-7 space-y-5">
              <Alert variant="success" title="Check your email">
                If an account exists for that email, a password reset link has
                been sent.
              </Alert>

              <Link
                href="/login"
                className="btn-primary flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-7 space-y-5"
            >
              {serverError && (
                <Alert variant="error">{serverError}</Alert>
              )}

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

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>

              <p className="text-center text-sm text-muted">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-brand hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}