import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { resetPasswordRequest } from "@/lib/auth-api";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/auth-validation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token")?.trim() ?? "";
  const [submitError, setSubmitError] = useState<string | null>(
    token ? null : "Missing reset token."
  );
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await resetPasswordRequest(values.token, values.password);
      await refreshUser().catch(() => undefined);
      navigate("/", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Password reset failed"
      );
    }
  });

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password for your admin account"
      footer={
        <>
          <Link to="/login" className="text-[#1F2A44] font-medium hover:underline">
            Back to sign in
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

        <input type="hidden" {...register("token")} />

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            New password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={!token}
              className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#1F2A44] focus:ring-2 focus:ring-[#1F2A44]/10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
          )}
          <p className="mt-1.5 text-xs text-gray-500">
            At least 8 characters with letters and numbers.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !token}
          className="w-full rounded-xl bg-[#1F2A44] text-white py-2.5 text-sm font-medium hover:bg-[#172033] disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? "Saving..." : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
