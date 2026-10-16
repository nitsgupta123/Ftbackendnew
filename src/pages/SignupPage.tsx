import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";


import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { signupSchema, type SignupFormValues } from "@/lib/auth-validation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setPendingEmail(null);
    setPendingMessage(null);
    try {
      const result = await signup({
        fullName: values.fullName,
        email: values.email,
        password: values.password
      });
      if (result.status === "pending_verification") {
        setPendingEmail(result.email);
        setPendingMessage(result.message);
        return;
      }
      navigate("/", { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Signup failed");
    }
  });

  if (pendingEmail) {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle="Your account is not in User Management until you confirm"
        footer={
          <>
            Already verified?{" "}
            <Link to="/login" className="text-[#1F2A44] font-medium hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="space-y-4 text-sm text-gray-600">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            {pendingMessage ??
              "We sent a verification link to your email. Open it to activate your account."}
          </div>
          <p>
            Sent to <span className="font-medium text-[#1F2A44]">{pendingEmail}</span>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create admin account"
      subtitle="You must verify your email before appearing in User Management"
      footer={
      <>
          Already have an account?{" "}
          <Link to="/login" className="text-[#1F2A44] font-medium hover:underline">
            Sign in
          </Link>
        </>
      }>
      
      <form onSubmit={onSubmit} className="space-y-5">
        {submitError &&
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        }

        <div>
          <Label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full name
          </Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm outline-none focus:border-[#1F2A44] focus:ring-2 focus:ring-[#1F2A44]/10"
            {...register("fullName")} />
          
          {errors.fullName &&
          <p className="mt-1.5 text-sm text-red-600">{errors.fullName.message}</p>
          }
        </div>

        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm outline-none focus:border-[#1F2A44] focus:ring-2 focus:ring-[#1F2A44]/10"
            {...register("email")} />
          
          {errors.email &&
          <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
          }
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#1F2A44] focus:ring-2 focus:ring-[#1F2A44]/10"
              {...register("password")} />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errors.password &&
          <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
          }
          <p className="mt-1.5 text-xs text-gray-500">
            At least 8 characters with letters and numbers.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#1F2A44] text-white py-2.5 text-sm font-medium hover:bg-[#172033] disabled:opacity-60 transition-colors">
          
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>);

}
