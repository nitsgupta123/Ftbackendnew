"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import PagesPanel from "@/components/pages/PagesPanel";
import { PAGE_MODULES } from "@/lib/page-modules";

function pageModuleIcon(slug: string): string {
  if (slug === "published") return "CheckCircle";
  if (slug === "drafts") return "Pencil";
  if (slug === "archived") return "Archive";
  return "FileStack";
}

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
      <ListPageHeader
        icon={pageModuleIcon(config.slug)}
        title={config.title}
        description={config.description}
        action={{
          label: "Create New Page",
          href: "/pages/new",
          icon: "Pencil",
        }}
      />

      <PagesPanel defaultStatus={config.status} hideStatusFilter={Boolean(config.status)} />
    </AdminShell>
  );
}
