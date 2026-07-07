import { Suspense } from "react";

export default function AddPackageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
          Loading package editor...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
