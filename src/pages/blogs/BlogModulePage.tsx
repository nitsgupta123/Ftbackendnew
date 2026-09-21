import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import BlogsPanel from "@/components/blogs/BlogsPanel";
import BlogCategoriesPanel, {
  type BlogCategoriesPanelHandle,
} from "@/components/blogs/BlogCategoriesPanel";
import { BLOG_MODULES } from "@/lib/blog-modules";

function blogModuleIcon(slug: string, endpoint?: string): string {
  if (endpoint === "categories") return "Tags";
  if (slug === "scheduled") return "Calendar";
  if (slug === "published") return "CheckCircle";
  if (slug === "drafts") return "Pencil";
  if (slug === "pending-review") return "Eye";
  if (slug === "archived") return "Archive";
  return "FileText";
}

export default function BlogModulePage() {
  const navigate = useNavigate();
  const { module: moduleParam } = useParams<{ module: string }>();
  const categoriesRef = useRef<BlogCategoriesPanelHandle>(null);
  const [moduleSlug, setModuleSlug] = useState<string | null>(null);
  const config = moduleSlug ? BLOG_MODULES[moduleSlug] : null;

  useEffect(() => {
    if (!moduleParam) return;
    if (!BLOG_MODULES[moduleParam]) {
      navigate("/blogs/all", { replace: true });
      return;
    }
    setModuleSlug(moduleParam);
  }, [moduleParam, navigate]);

  if (!config) {
    return (
      <AdminShell breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Blogs", href: "/blogs/all" }]}>
        <div className="p-12 text-center text-sm text-gray-500">Loading…</div>
      </AdminShell>
    );
  }

  const action =
    config.endpoint === "categories"
      ? {
          label: "Add Category",
          onClick: () => categoriesRef.current?.openCreate(),
        }
      : {
          label: "Write New Blog",
          href: "/blogs/new",
          icon: "Pencil",
        };

  return (
    <AdminShell breadcrumbs={config.breadcrumbs}>
      <ListPageHeader
        icon={blogModuleIcon(config.slug, config.endpoint)}
        title={config.title}
        description={config.description}
        action={action}
      />

      {config.endpoint === "categories" ? (
        <BlogCategoriesPanel ref={categoriesRef} />
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
