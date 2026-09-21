import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import PageForm from "@/components/pages/PageForm";
import { Icon } from "@/components/ui/icons";
import { createPage } from "@/lib/page-api";
import type { CreatePageFormValues } from "@/lib/validation";

export default function NewPagePage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreatePageFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        excerpt: data.excerpt || null,
        content: data.content || null,
        featured_image_path: data.featured_image_path || null,
        page_type: data.page_type || null,
        seo_meta_title: data.seo_meta_title || null,
        seo_meta_description: data.seo_meta_description || null,
      };
      const { page } = await createPage(payload);
      navigate(`/pages/edit/${page.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Pages", href: "/pages/all" },
        { label: "Create Page" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="Pencil" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">Create New Page</h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">
          Create a new CMS page with SEO metadata, navigation settings, and content.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <PageForm
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/pages/all")}
        />
      </div>
    </AdminShell>
  );
}
