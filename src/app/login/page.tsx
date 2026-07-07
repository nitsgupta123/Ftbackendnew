import { Suspense } from "react";
import LoginPage from "./page.client";

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
