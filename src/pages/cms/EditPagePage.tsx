import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import PageForm from "@/components/pages/PageForm";
import { Icon } from "@/components/ui/icons";
import { getPage, updatePage } from "@/lib/page-api";
import type { CmsPageRecord } from "@/lib/page-types";
import type { CreatePageFormValues } from "@/lib/validation";

export default function EditPagePage() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const [pageId, setPageId] = useState<number | null>(null);
  const [page, setPage] = useState<CmsPageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = Number(idParam);
      if (!Number.isInteger(id) || id <= 0) {
        navigate("/pages/all", { replace: true });
        return;
      }
      setPageId(id);
      setLoading(true);
      try {
        const { page: loaded } = await getPage(id);
        setPage(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [idParam, navigate]);

  async function handleSubmit(data: CreatePageFormValues) {
    if (!pageId) return;

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
      const { page: updated } = await updatePage(pageId, payload);
      setPage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update page");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Pages", href: "/pages/all" },
          { label: "Edit Page" },
        ]}
      >
        <div className="p-12 text-center text-sm text-gray-500">Loading page…</div>
      </AdminShell>
    );
  }

  if (!page) {
    return (
      <AdminShell
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Pages", href: "/pages/all" },
          { label: "Edit Page" },
        ]}
      >
        <div className="p-12 text-center text-sm text-red-600">
          {error ?? "Page not found."}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Pages", href: "/pages/all" },
        { label: page.title },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="Pencil" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">Edit Page</h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">{page.title}</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <PageForm
          initialData={page}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/pages/all")}
        />
      </div>
    </AdminShell>
  );
}
