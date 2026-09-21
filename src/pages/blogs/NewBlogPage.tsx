import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import BlogForm from "@/components/blogs/BlogForm";
import { Icon } from "@/components/ui/icons";
import { createBlogPost } from "@/lib/blog-api";
import type { CreateBlogPostFormValues } from "@/lib/validation";

export default function NewBlogPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreateBlogPostFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        excerpt: data.excerpt || null,
        content: data.content || null,
        featured_image_path: data.featured_image_path || null,
        author_name: data.author_name || null,
        seo_meta_title: data.seo_meta_title || null,
        seo_meta_description: data.seo_meta_description || null,
        category_id: data.category_id ?? null,
      };
      const { post } = await createBlogPost(payload);
      const listPath =
        post.status === "published"
          ? "/blogs/published"
          : post.status === "scheduled"
            ? "/blogs/scheduled"
            : post.status === "draft"
              ? "/blogs/drafts"
              : post.status === "archived"
                ? "/blogs/archived"
                : "/blogs/all";
      navigate(listPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create blog post");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Blogs", href: "/blogs/all" },
        { label: "Write New Blog" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="Pencil" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">Write New Blog</h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">
          Create a new blog post with SEO metadata, categories, and featured image.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <BlogForm
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/blogs/all")}
        />
      </div>
    </AdminShell>
  );
}
