"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PagesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pages/all");
  }, [router]);

  return null;
}
