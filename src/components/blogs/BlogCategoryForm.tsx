"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import { createBlogCategorySchema, type CreateBlogCategoryFormValues } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import type { BlogCategoryRecord } from "@/lib/blog-category-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

const GOLD = "#A68231";

const inputClass =
  "w-full h-11 px-3.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";
const selectClass =
  "h-11 px-3.5 pr-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";
const textareaClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] resize-y min-h-[96px] transition-colors";

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-[#FFFCF7] to-white">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${GOLD}14`, color: GOLD }}
        >
          <Icon name={icon} size={17} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold text-[#1F2A44]">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

interface BlogCategoryFormProps {
  initialData?: BlogCategoryRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreateBlogCategoryFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function BlogCategoryForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: BlogCategoryFormProps) {
  const isEdit = Boolean(initialData);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateBlogCategoryFormValues>({
    resolver: zodResolver(createBlogCategorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      display_order: initialData?.display_order ?? 0,
      status: initialData?.status ?? "active",
      seo_meta_title: initialData?.seo_meta_title ?? "",
      seo_meta_description: initialData?.seo_meta_description ?? "",
    },
  });

  const nameValue = useWatch({ control, name: "name" }) ?? "";
  const slugValue = useWatch({ control, name: "slug" }) ?? "";
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description ?? "",
        display_order: initialData.display_order,
        status: initialData.status,
        seo_meta_title: initialData.seo_meta_title ?? "",
        seo_meta_description: initialData.seo_meta_description ?? "",
      });
      queueMicrotask(() => setSlugTouched(true));
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (!slugTouched && nameValue && !isEdit) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, slugTouched, setValue, isEdit]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <SectionCard
          icon="FileText"
          title="Basic Information"
          description="Name and organize how this category appears across your blog."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-[#334155] mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                className={inputClass}
                placeholder="e.g. Travel Tips"
                {...register("name")}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug" className="block text-sm font-medium text-[#334155] mb-1.5">
                URL Slug
              </Label>
              <Input
                id="slug"
                className={inputClass}
                placeholder="travel-tips"
                {...register("slug", { onChange: () => setSlugTouched(true) })}
              />
              {errors.slug && <p className="mt-1.5 text-xs text-red-600">{errors.slug.message}</p>}
              {slugValue && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Preview: <span className="font-mono text-gray-600">/blog/category/{slugValue}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="block text-sm font-medium text-[#334155] mb-1.5">
              Description
            </Label>
            <Textarea
              id="description"
              className={textareaClass}
              placeholder="Brief summary of what posts belong in this category."
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_order" className="block text-sm font-medium text-[#334155] mb-1.5">
                Display Order
              </Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                className={inputClass}
                {...register("display_order", { valueAsNumber: true })}
              />
              <p className="mt-1.5 text-xs text-gray-400">Lower numbers appear first in lists.</p>
            </div>
            <div>
              <Label htmlFor="status" className="block text-sm font-medium text-[#334155] mb-1.5">
                Status
              </Label>
              <NativeSelect id="status" className={selectClass} {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon="Search"
          title="SEO Settings"
          description="Optional metadata to improve search visibility for this category."
        >
          <div>
            <Label htmlFor="seo_meta_title" className="block text-sm font-medium text-[#334155] mb-1.5">
              Meta Title
            </Label>
            <Input
              id="seo_meta_title"
              className={inputClass}
              placeholder="Title shown in search engine results"
              {...register("seo_meta_title")}
            />
          </div>
          <div>
            <Label
              htmlFor="seo_meta_description"
              className="block text-sm font-medium text-[#334155] mb-1.5"
            >
              Meta Description
            </Label>
            <Textarea
              id="seo_meta_description"
              className={textareaClass}
              placeholder="Short description for search engines (recommended 150–160 characters)"
              {...register("seo_meta_description")}
            />
          </div>
        </SectionCard>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8ECF0] bg-[#FAFBFC]">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-10 px-5 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-10 px-6 items-center gap-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm"
          style={{ backgroundColor: GOLD }}
        >
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Category" : "Create Category"}
        </Button>
      </div>
    </form>
  );
}
