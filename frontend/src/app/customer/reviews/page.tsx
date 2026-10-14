"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerReviewsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/reviews"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to Reviews...</div>;
}