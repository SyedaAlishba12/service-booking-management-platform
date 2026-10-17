
"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/app/providers/AuthProvider";
import { apiClient } from "@/utils/api_client";

type UserProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  profile_image_url?: string | null;
  is_active?: boolean;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/customer/dashboard" },
  { label: "Bookings", href: "/bookings" },
  { label: "Services", href: "/services" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/customer/profile" },
];

function imageUrl(path?: string | null): string {
  if (!path) return "";

  if (path.startsWith("http") || path.startsWith("blob:")) {
    return path;
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL ?? ""
  ).replace(/\/+$/, "");

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function CustomerProfilePage() {
  const {
    user: authUser,
    updateProfile,
    uploadProfileImage,
  } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load the latest profile from the backend.
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const result = await apiClient.get<UserProfile>(
          "/api/users/me"
        );

        if (!active) return;

        setProfile(result);
        setFullName(result.full_name ?? "");
        setPhone(result.phone ?? "");
        setPreview(imageUrl(result.profile_image_url));
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  // Release temporary image previews when they are replaced.
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (trimmedName.length > 150) {
      setError("Your name must be 150 characters or fewer.");
      return;
    }

    setSaving(true);

    try {
      // This updates the backend AND AuthProvider's shared user state.
      const updatedUser = await updateProfile({
        full_name: trimmedName,
        phone: trimmedPhone || null,
      });

      setProfile(updatedUser);
      setFullName(updatedUser.full_name ?? trimmedName);
      setPhone(updatedUser.phone ?? "");

      setSuccess("Your profile information has been saved.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your profile. Please check your details."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleImageSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setSuccess("");

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
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      return;
    }

    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleImageUpload() {
    if (!selectedImage) {
      setError("Please choose an image first.");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      // AuthProvider uploads the image, fetches the updated user,
      // and updates shared state for the header and sidebar.
      const updatedUser = await uploadProfileImage(selectedImage);

      setProfile(updatedUser);
      setPreview(imageUrl(updatedUser.profile_image_url));
      setSelectedImage(null);

      setSuccess("Your profile image has been uploaded.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Image upload failed. Please try another image."
      );
    } finally {
      setUploading(false);
    }
  }

  const displayName =
    profile?.full_name ||
    authUser?.full_name ||
    "Customer";

  const displayImage = imageUrl(
    profile?.profile_image_url ??
      authUser?.profile_image_url
  );

  if (loading) {
    return (
      <DashboardLayout
        sidebarItems={NAV_ITEMS}
        activeHref="/customer/profile"
        title="Customer Profile"
        userName={authUser?.full_name}
        userEmail={authUser?.email}
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <p className="animate-pulse text-gray-500">
            Loading your profile…
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarItems={NAV_ITEMS}
      activeHref="/customer/profile"
      title="Customer Profile"
      description="Manage your personal information and account"
      userName={displayName}
      userEmail={profile?.email ?? authUser?.email}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            href="/customer/dashboard"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Profile &amp; Account Settings
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Keep your contact details up to date.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {!profile && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-gray-700">
              Your profile could not be displayed.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 font-semibold text-blue-700 hover:underline"
            >
              Reload profile
            </button>
          </div>
        )}

        {profile && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Profile Picture
              </h2>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
                  {preview || displayImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview || displayImage}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName.trim().charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="profile-image"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Choose an image
                  </label>

                  <input
                    id="profile-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelection}
                    disabled={uploading}
                    className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    JPG, PNG, or WebP. Maximum size: 5 MB.
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleImageUpload()}
                    disabled={!selectedImage || uploading}
                    className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Upload picture"}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Personal Information
              </h2>

              <form onSubmit={handleSave} className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor="full-name"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Full Name *
                  </label>

                  <input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    maxLength={150}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={profile.email ?? authUser?.email ?? ""}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Email editing is not supported by the current profile API.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    maxLength={20}
                    placeholder="Enter your phone number"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="account-role"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Account Role
                  </label>

                  <input
                    id="account-role"
                    value={profile.role ?? authUser?.role ?? "CUSTOMER"}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Account status:{" "}
                    <span
                      className={
                        profile.is_active === false
                          ? "font-semibold text-red-600"
                          : "font-semibold text-green-700"
                      }
                    >
                      {profile.is_active === false
                        ? "Inactive"
                        : "Active"}
                    </span>
                  </p>

                  <button
                    type="submit"
                    disabled={saving || uploading}
                    className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving changes…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Account Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Your account can be deactivated by an authorized
                administrator. To keep historical bookings and related
                records safe, this page does not permanently delete
                your account.
              </p>

              <Link
                href="/notifications"
                className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
              >
                Manage notifications →
              </Link>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
