"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import PagesPanel from "@/components/pages/PagesPanel";
import { Icon } from "@/components/ui/icons";
import { PAGE_MODULES } from "@/lib/page-modules";

export default function PageModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const router = useRouter();
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);
  const config = moduleSlug ? PAGE_MODULES[moduleSlug] : null;

  useEffect(() => {
    params.then((p) => {
      if (!PAGE_MODULES[p.module]) {
        router.replace("/pages/all");
        return;
      }
      setModuleSlug(p.module);
    });
  }, [params, router]);

  if (!config) {
    return (
      <AdminShell breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Pages", href: "/pages/all" }]}>
        <div className="p-12 text-center text-sm text-gray-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell breadcrumbs={config.breadcrumbs}>
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="FileStack" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">{config.title}</h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">{config.description}</p>
      </div>

      <PagesPanel defaultStatus={config.status} hideStatusFilter={Boolean(config.status)} />
    </AdminShell>
  );
}
