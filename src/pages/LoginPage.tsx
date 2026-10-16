import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { FORGOT_PASSWORD_PATH } from "@/lib/auth-paths";
import { loginSchema, type LoginFormValues } from "@/lib/auth-validation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
      const next = searchParams.get("next");
      navigate(next && next.startsWith("/") ? next : "/", { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Login failed");
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to the Fayyaz Travels admin panel"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
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

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </Label>
            <Link
              to={FORGOT_PASSWORD_PATH}
              className="text-sm font-medium text-[#1F2A44] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#1F2A44] text-white py-2.5 text-sm font-medium hover:bg-[#172033] disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
