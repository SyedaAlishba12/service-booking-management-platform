"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

import {
  loginSchema,
  type LoginFormData,
} from "@/schemas/authSchemas";

import { useAuth } from "@/app/providers/AuthProvider";
import { getApiErrorMessage } from "@/utils/api_error_handler";

function getRoleDashboard(role: string): string | null {
  if (role === "CUSTOMER") return "/dashboard";
  if (role === "PROVIDER") return "/provider/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";

  return null;
}

function getSafeNextPath(value: string | null): string | null {
  if (!value) return null;

  // Allow only local paths.
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }

  const pathname = value.split("?")[0].split("#")[0];

  // Never redirect to authentication pages.
  const authPaths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ];

  if (authPaths.includes(pathname)) {
    return null;
  }

  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const registered = searchParams.get("registered") === "1";
  const requestedNext = getSafeNextPath(searchParams.get("next"));

  const { login } = useAuth();

  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    setSubmitting(true);

    try {
      const loggedInUser = await login(data.email, data.password);

      const dashboard = getRoleDashboard(loggedInUser.role);

      if (!dashboard) {
        setServerError(
          "Your account role is not recognized. Please contact support."
        );
        return;
      }

      // Only honor a requested destination if it is the
      // dashboard assigned to the authenticated user's role.
      if (requestedNext === dashboard) {
        router.replace(requestedNext);
      } else {
        router.replace(dashboard);
      }
    } catch (error) {
      setServerError(
        getApiErrorMessage(
          error,
          "Unable to sign in. Please check your credentials."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-blue px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link
          href="/landing"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </Link>

        <div className="w-full rounded-3xl bg-surface p-6 shadow-[0_12px_40px_rgba(8,45,110,0.10)] sm:p-8">
          <div className="mb-8 text-center">
            <Link
              href="/landing"
              className="text-2xl font-bold text-foreground"
            >
              ServiceHub
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-foreground">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-muted">
              Sign in to manage your service bookings.
            </p>
          </div>

          {registered && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Account created successfully. Please sign in.
            </div>
          )}

          {serverError && (
            <div className="mb-5">
              <Alert variant="error">{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              name="password"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
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

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-brand hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-brand hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}