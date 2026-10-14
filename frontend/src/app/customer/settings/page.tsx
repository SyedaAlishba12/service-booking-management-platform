"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerSettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/profile"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to Settings...</div>;
}