
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import LoadingState from "@/components/ui/LoadingState";
import { Card, CardContent } from "@/components/ui/Card";

import {
  profileSchema,
  type ProfileFormData,
} from "@/schemas/authSchemas";

import { useAuth } from "@/app/providers/AuthProvider";
import { getApiErrorMessage } from "@/utils/api_error_handler";

function getReturnPath(role: string): string {
  if (role === "CUSTOMER") return "/dashboard";
  if (role === "PROVIDER") return "/provider/dashboard";

  // The admin dashboard route has not been confirmed.
  return "/landing";
}

function ProfileContent() {
  const { user, updateProfile, uploadProfileImage } = useAuth();

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      profile_image_url: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    reset({
      full_name: user.full_name,
      phone: user.phone ?? "",
      profile_image_url: user.profile_image_url ?? "",
    });
  }, [user, reset]);

  if (!user) {
    return <LoadingState message="Loading profile..." />;
  }

  const onSubmit = async (data: ProfileFormData) => {
    setMessage("");
    setError("");

    try {
      await updateProfile({
        full_name: data.full_name,
        phone: data.phone || null,
      });

      setMessage("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Unable to update your profile."
        )
      );
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again.
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setImageError(
        "Choose a JPEG, PNG, or WebP image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be 5 MB or smaller.");
      return;
    }

    setImageError("");
    setError("");
    setMessage("");
    setUploadingImage(true);

    try {
      await uploadProfileImage(file);
      setMessage("Profile image uploaded successfully.");
    } catch (err) {
      setImageError(
        getApiErrorMessage(
          err,
          "Unable to upload your profile image."
        )
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const profileImageUrl = user.profile_image_url
    ? user.profile_image_url.startsWith("http")
      ? user.profile_image_url
      : `${(
          process.env.NEXT_PUBLIC_API_URL ?? ""
        ).replace(/\/$/, "")}${user.profile_image_url}`
    : null;

  const returnPath = getReturnPath(user.role);
  const returnLabel =
    user.role === "ADMIN"
      ? "Back to Home"
      : "Back to Dashboard";

  return (
    <main className="min-h-screen bg-surface-blue px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={returnPath}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <span aria-hidden="true">←</span>
          {returnLabel}
        </Link>

        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
            Account
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            My profile
          </h1>

          <p className="mt-2 text-sm text-muted">
            Manage your personal information and account details.
          </p>
        </div>

        {message && (
          <div className="mb-5">
            <Alert variant="success">{message}</Alert>
          </div>
        )}

        {error && (
          <div className="mb-5">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <Card>
          <CardContent className="p-6 sm:p-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <div className="space-y-3">
                <label className="block text-sm font-semibold">
                  Profile image
                </label>

                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Your profile"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand">
                    {user.full_name
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="block w-full text-sm"
                />

                <p className="text-xs text-muted">
                  JPEG, PNG, or WebP. Maximum size: 5 MB.
                </p>

                {uploadingImage && (
                  <p className="text-sm text-muted">
                    Uploading image...
                  </p>
                )}

                {imageError && (
                  <p
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {imageError}
                  </p>
                )}
              </div>

              <Controller
                name="full_name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Full name"
                    error={errors.full_name?.message}
                  />
                )}
              />

              <Input
                label="Email"
                value={user.email}
                disabled
                hint="Email is used as your login identifier."
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="tel"
                    label="Phone"
                    error={errors.phone?.message}
                  />
                )}
              />

              <div className="rounded-xl bg-brand-soft p-4">
                <p className="text-sm font-semibold text-foreground">
                  Account type
                </p>

                <p className="mt-1 text-sm text-muted">
                  {user.role}
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || uploadingImage}
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}