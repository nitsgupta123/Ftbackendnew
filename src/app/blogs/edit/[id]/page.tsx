"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import BlogForm from "@/components/blogs/BlogForm";
import { Icon } from "@/components/ui/icons";
import { getBlogPost, updateBlogPost } from "@/lib/blog-api";
import type { BlogPostRecord } from "@/lib/blog-types";
import type { CreateBlogPostFormValues } from "@/lib/validation";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [postId, setPostId] = useState<number | null>(null);
  const [post, setPost] = useState<BlogPostRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      const id = Number(p.id);
      if (!Number.isInteger(id) || id <= 0) {
        router.replace("/blogs/all");
        return;
      }
      setPostId(id);
      setLoading(true);
      try {
        const { post: loaded } = await getBlogPost(id);
        setPost(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blog post");
      } finally {
        setLoading(false);
      }
    });
  }, [params, router]);

  async function handleSubmit(data: CreateBlogPostFormValues) {
    if (!postId) return;

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
      const { post: updated } = await updateBlogPost(postId, payload);
      setPost(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update blog post");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Blogs", href: "/blogs/all" },
          { label: "Edit Post" },
        ]}
      >
        <div className="p-12 text-center text-sm text-gray-500">Loading blog post…</div>
      </AdminShell>
    );
  }

  if (!post) {
    return (
      <AdminShell
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Blogs", href: "/blogs/all" },
          { label: "Edit Post" },
        ]}
      >
        <div className="p-12 text-center text-sm text-red-600">
          {error ?? "Blog post not found."}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Blogs", href: "/blogs/all" },
        { label: post.title },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="Pencil" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">Edit Blog Post</h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">{post.title}</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <BlogForm
          initialData={post}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/blogs/all")}
        />
      </div>
    </AdminShell>
  );
}
