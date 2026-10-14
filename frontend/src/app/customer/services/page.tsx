"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerServicesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/search"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to Services Search...</div>;
}