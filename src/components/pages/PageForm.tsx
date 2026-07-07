"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import { createPageSchema, type CreatePageFormValues } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import type { CmsPageRecord } from "@/lib/page-types";
import { PAGE_TYPE_OPTIONS } from "@/lib/page-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass =
  "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";

interface PageFormProps {
  initialData?: CmsPageRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreatePageFormValues) => Promise<void>;
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
      <Button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-[#27AE60]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </Button>
    </div>
  );
}

export default function PageForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: PageFormProps) {
  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePageFormValues>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      excerpt: initialData?.excerpt ?? "",
      content: initialData?.content ?? "",
      featured_image_path: initialData?.featured_image_path ?? "",
      page_type: initialData?.page_type ?? "",
      status: initialData?.status ?? "draft",
      show_in_nav: initialData?.show_in_nav ?? false,
      display_order: initialData?.display_order ?? 0,
      seo_meta_title: initialData?.seo_meta_title ?? "",
      seo_meta_description: initialData?.seo_meta_description ?? "",
    },
  });

  const nameValue = useWatch({ control, name: "title" }) ?? "";
  const slugValue = useWatch({ control, name: "slug" }) ?? "";
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        slug: initialData.slug,
        excerpt: initialData.excerpt ?? "",
        content: initialData.content ?? "",
        featured_image_path: initialData.featured_image_path ?? "",
        page_type: initialData.page_type ?? "",
        status: initialData.status,
        show_in_nav: initialData.show_in_nav,
        display_order: initialData.display_order,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              placeholder="Short summary shown in page listings and search results."
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
              placeholder="Write your page content. HTML is supported."
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
                htmlFor="page_type"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Page Type
              </Label>
              <NativeSelect id="page_type" className={inputClass} {...register("page_type")}>
                <option value="">General</option>
                {PAGE_TYPE_OPTIONS.filter((o) => o.value).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label
                htmlFor="display_order"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Display Order
              </Label>
              <Input
                id="display_order"
                type="number"
                min={0}
                className={inputClass}
                {...register("display_order", { valueAsNumber: true })}
              />
            </div>

            <Controller
              control={control}
              name="show_in_nav"
              render={({ field }) => (
                <ToggleSwitch
                  label="Show in Navigation"
                  enabled={field.value ?? false}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#1F2A44]">Media</h3>

            <div>
              <Label
                htmlFor="featured_image_path"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Hero Image URL
              </Label>
              <Input
                id="featured_image_path"
                className={inputClass}
                placeholder="/images/pages/about-us.jpg"
                {...register("featured_image_path")}
              />
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
          Preview URL: <span className="font-mono text-gray-600">/{slugValue}</span>
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
          {isSaving ? "Saving…" : isEdit ? "Update Page" : "Create Page"}
        </Button>
      </div>
    </form>
  );
}
