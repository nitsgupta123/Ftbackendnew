"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [error, setError] = useState<string | null>(
    token ? null : "Missing verification token."
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function run() {
      try {
        await verifyEmail(token);
        if (!cancelled) {
          setStatus("success");
          router.replace("/");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Verification failed");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail, router]);

  return (
    <AuthLayout
      title={status === "success" ? "Email verified" : "Verifying email"}
      subtitle={
        status === "error"
          ? "We could not verify this link"
          : "Activating your admin account"
      }
      footer={
        <>
          <Link href="/login" className="text-[#1F2A44] font-medium hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {status === "loading" && (
        <p className="text-sm text-gray-600">Please wait while we verify your email…</p>
      )}
      {status === "success" && (
        <p className="text-sm text-emerald-700">
          Your email is verified. Your account is now active in User Management.
        </p>
      )}
      {status === "error" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
          <Button asChild className="w-full rounded-xl bg-[#1F2A44] text-white">
            <Link href="/signup">Sign up again</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
