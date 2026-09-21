import type { ReactNode } from "react";
import BrandLogo from "@/components/layout/BrandLogo";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo className="h-12" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[#1F2A44] tracking-tight">{title}</h1>
          <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 sm:p-8">
          {children}
        </div>

        {footer ? (
          <div className="text-center mt-6 text-sm text-gray-500">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
