import { Suspense } from "react";
import SignupPage from "./page.client";

export default function SignupRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <SignupPage />
    </Suspense>
  );
}
