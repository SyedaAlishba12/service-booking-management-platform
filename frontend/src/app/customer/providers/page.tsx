"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerProvidersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/providers"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to Providers...</div>;
}