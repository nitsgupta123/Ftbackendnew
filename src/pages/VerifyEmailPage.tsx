import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
          navigate("/", { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Verification failed");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail, navigate]);

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
          <Link to="/login" className="text-[#1F2A44] font-medium hover:underline">
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
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
