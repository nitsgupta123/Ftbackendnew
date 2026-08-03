"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import BlogsPanel from "@/components/blogs/BlogsPanel";
import BlogCategoriesPanel from "@/components/blogs/BlogCategoriesPanel";
import { Icon } from "@/components/ui/icons";
import { BLOG_MODULES } from "@/lib/blog-modules";

export default function BlogModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const router = useRouter();
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);
  const config = moduleSlug ? BLOG_MODULES[moduleSlug] : null;

  useEffect(() => {
    params.then((p) => {
      if (!BLOG_MODULES[p.module]) {
        router.replace("/blogs/all");
        return;
      }
      setModuleSlug(p.module);
    });
  }, [params, router]);

  if (!config) {
    return (
      <AdminShell breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Blogs", href: "/blogs/all" }]}>
        <div className="p-12 text-center text-sm text-gray-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell breadcrumbs={config.breadcrumbs}>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                  config.endpoint === "categories" || config.slug === "published"
                    ? "bg-[#A68231]/12 text-[#A68231] ring-[#A68231]/20"
                    : "bg-gray-100 text-[#555E69] ring-[#E5E7EB]"
                }`}
              >
                <Icon name="FileText" size={20} />
              </div>
              <h1 className="text-xl font-semibold text-[#1F2A44] tracking-tight">{config.title}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-[52px] leading-relaxed">{config.description}</p>
          </div>
        </div>
      </div>

      {config.endpoint === "categories" ? (
        <BlogCategoriesPanel />
      ) : (
        <BlogsPanel
          key={config.slug}
          defaultStatus={config.status}
          hideStatusFilter={Boolean(config.status)}
        />
      )}
    </AdminShell>
  );
}
