"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import { createBlogPostSchema, type CreateBlogPostFormValues } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import type { BlogPostRecord } from "@/lib/blog-types";
import { listActiveBlogCategories } from "@/lib/blog-category-api";
import type { BlogCategoryRecord } from "@/lib/blog-category-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass =
  "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";

interface BlogFormProps {
  initialData?: BlogPostRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreateBlogPostFormValues) => Promise<void>;
  onCancel: () => void;
}

function ToggleSwitch({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3">
      <span className="text-sm font-medium text-[#334155]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27AE60]/40 focus-visible:ring-offset-2 ${
          enabled ? "bg-[#27AE60]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function BlogForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: BlogFormProps) {
  const isEdit = Boolean(initialData);
  const [categories, setCategories] = useState<Pick<BlogCategoryRecord, "id" | "name">[]>([]);
  const [tagsInput, setTagsInput] = useState(initialData?.tags.join(", ") ?? "");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateBlogPostFormValues>({
    resolver: zodResolver(createBlogPostSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      excerpt: initialData?.excerpt ?? "",
      content: initialData?.content ?? "",
      featured_image_path: initialData?.featured_image_path ?? "",
      category_id: initialData?.category_id ?? null,
      author_name: initialData?.author_name ?? "",
      status: initialData?.status ?? "draft",
      is_featured: initialData?.is_featured ?? false,
      seo_meta_title: initialData?.seo_meta_title ?? "",
      seo_meta_description: initialData?.seo_meta_description ?? "",
      tags: initialData?.tags ?? [],
    },
  });

  const nameValue = useWatch({ control, name: "title" }) ?? "";
  const slugValue = useWatch({ control, name: "slug" }) ?? "";
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    listActiveBlogCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        slug: initialData.slug,
        excerpt: initialData.excerpt ?? "",
        content: initialData.content ?? "",
        featured_image_path: initialData.featured_image_path ?? "",
        category_id: initialData.category_id ?? null,
        author_name: initialData.author_name ?? "",
        status: initialData.status,
        is_featured: initialData.is_featured,
        seo_meta_title: initialData.seo_meta_title ?? "",
        seo_meta_description: initialData.seo_meta_description ?? "",
        tags: initialData.tags,
      });
      setTagsInput(initialData.tags.join(", "));
      queueMicrotask(() => setSlugTouched(true));
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (!slugTouched && nameValue && !isEdit) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, slugTouched, setValue, isEdit]);

  async function handleFormSubmit(data: CreateBlogPostFormValues) {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await onSubmit({ ...data, tags });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <Label htmlFor="title" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input id="title" className={inputClass} {...register("title")} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="slug" className="block text-sm font-semibold text-[#334155] mb-1.5">
              URL Slug
            </Label>
            <Input
              id="slug"
              className={inputClass}
              {...register("slug", { onChange: () => setSlugTouched(true) })}
            />
            <p className="mt-1 text-xs text-gray-400">Auto-generated from title if left blank.</p>
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
          </div>

          <div>
            <Label htmlFor="excerpt" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Excerpt
            </Label>
            <Textarea
              id="excerpt"
              className={textareaClass}
              rows={3}
              placeholder="Short summary shown in blog listings and search results."
              {...register("excerpt")}
            />
          </div>

          <div>
            <Label htmlFor="content" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Content
            </Label>
            <Textarea
              id="content"
              className={`${textareaClass} min-h-[280px] font-mono text-xs`}
              rows={14}
              placeholder="Write your blog content. HTML is supported."
              {...register("content")}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-[#E5E7EB] bg-gray-50/50 p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#1F2A44]">Publish Settings</h3>

            <div>
              <Label htmlFor="status" className="block text-sm font-semibold text-[#334155] mb-1.5">
                Status
              </Label>
              <NativeSelect id="status" className={inputClass} {...register("status")}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="category_id"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Category
              </Label>
              <NativeSelect
                id="category_id"
                className={inputClass}
                {...register("category_id", {
                  setValueAs: (v) => (v === "" || v === "null" ? null : Number(v)),
                })}
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="author_name"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Author Name
              </Label>
              <Input
                id="author_name"
                className={inputClass}
                placeholder="Fayyaz Travels Team"
                {...register("author_name")}
              />
            </div>

            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <ToggleSwitch
                  label="Featured Post"
                  enabled={field.value ?? false}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#1F2A44]">Media & Tags</h3>

            <div>
              <Label
                htmlFor="featured_image_path"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Featured Image URL
              </Label>
              <Input
                id="featured_image_path"
                className={inputClass}
                placeholder="/images/blogs/my-post.jpg"
                {...register("featured_image_path")}
              />
            </div>

            <div>
              <Label htmlFor="tags" className="block text-sm font-semibold text-[#334155] mb-1.5">
                Tags
              </Label>
              <Input
                id="tags"
                className={inputClass}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="travel, dubai, tips"
              />
              <p className="mt-1 text-xs text-gray-400">Comma-separated tags</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#1F2A44]">SEO</h3>
            <div>
              <Label
                htmlFor="seo_meta_title"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Meta Title
              </Label>
              <Input id="seo_meta_title" className={inputClass} {...register("seo_meta_title")} />
            </div>
            <div>
              <Label
                htmlFor="seo_meta_description"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Meta Description
              </Label>
              <Textarea
                id="seo_meta_description"
                className={textareaClass}
                rows={3}
                {...register("seo_meta_description")}
              />
            </div>
          </div>
        </div>
      </div>

      {slugValue && (
        <p className="text-xs text-gray-400">
          Preview URL: <span className="font-mono text-gray-600">/blog/{slugValue}</span>
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-11 px-5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 disabled:opacity-50"
        >
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Post" : "Create Post"}
        </Button>
      </div>
    </form>
  );
}
