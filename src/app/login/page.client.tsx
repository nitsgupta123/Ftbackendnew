"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { loginSchema, type LoginFormValues } from "@/lib/auth-validation";import { Label } from "@/components/ui/label";import { Input } from "@/components/ui/input";import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Login failed");
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to the Fayyaz Travels admin panel"
      footer={
      <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#1F2A44] font-medium hover:underline">
            Create one
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
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm outline-none focus:border-[#1F2A44] focus:ring-2 focus:ring-[#1F2A44]/10"
            {...register("password")} />
          
          {errors.password &&
          <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
          }
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#1F2A44] text-white py-2.5 text-sm font-medium hover:bg-[#172033] disabled:opacity-60 transition-colors">
          
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>);

}
