"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BlogsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/blogs/all");
  }, [router]);

  return null;
}
