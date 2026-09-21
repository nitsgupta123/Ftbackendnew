import { Link } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthLayout from "@/components/auth/AuthLayout";
import { forgotPasswordRequest } from "@/lib/auth-api";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/auth-validation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bypassPath, setBypassPath] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setBypassPath(null);
    try {
      const result = await forgotPasswordRequest(values.email);
      setSuccessMessage(result.message);
      if (result.bypass && result.resetPath) {
        setBypassPath(result.resetPath);
      } else if (result.previewUrl?.startsWith("http")) {
        setBypassPath(result.previewUrl);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not start password reset"
      );
    }
  });

  return (
    <AuthLayout
      title="Account recovery"
      subtitle="Enter your admin email to reset your password"
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="text-[#1F2A44] font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
            {bypassPath && (
              <p className="mt-2 break-all">
                {bypassPath.startsWith("http") ? (
                  <>
                    Preview:{" "}
                    <a
                      href={bypassPath}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-medium"
                    >
                      {bypassPath}
                    </a>
                  </>
                ) : (
                  <>
                    Bypass link:{" "}
                    <Link to={bypassPath} className="underline font-medium">
                      Set a new password
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm outline-none focus:border-[#1F2A44] focus:ring-2 focus:ring-[#1F2A44]/10"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#1F2A44] text-white py-2.5 text-sm font-medium hover:bg-[#172033] disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
