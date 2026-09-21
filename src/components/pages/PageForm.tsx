import { useEffect, useRef, useState } from "react";
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
import BlogRichTextEditor from "@/components/blogs/BlogRichTextEditor";
import { uploadMediaFile } from "@/lib/media-api";

const GOLD = "#A68231";
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

import { ToggleSwitch } from "@/components/ui/toggle-switch";

function LabeledToggleSwitch({
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
      <ToggleSwitch checked={enabled} onCheckedChange={onChange} />
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
  const featuredImagePath = useWatch({ control, name: "featured_image_path" }) ?? "";
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);

  async function handleFeaturedImageUpload(file: File) {
    setImageUploadError(null);
    setImageUploading(true);
    try {
      const result = await uploadMediaFile(file);
      setValue("featured_image_path", result.url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setImageUploading(false);
    }
  }

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
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <BlogRichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Write your page content. HTML is supported."
                />
              )}
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
                <LabeledToggleSwitch
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
              <Label className="block text-sm font-semibold text-[#334155] mb-1.5">
                Hero Image
              </Label>
              <input
                ref={featuredImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleFeaturedImageUpload(file);
                }}
              />
              <input type="hidden" {...register("featured_image_path")} />

              {featuredImagePath ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F8F9FB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImagePath}
                      alt="Hero image preview"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={imageUploading}
                      onClick={() => featuredImageInputRef.current?.click()}
                      className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#334155] hover:bg-[#F9FAFB]"
                    >
                      {imageUploading ? "Uploading…" : "Replace image"}
                    </Button>
                    <Button
                      type="button"
                      disabled={imageUploading}
                      onClick={() => {
                        setImageUploadError(null);
                        setValue("featured_image_path", "", {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      className="h-9 rounded-lg border border-[#FECACA] bg-white px-3 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={imageUploading}
                  onClick={() => featuredImageInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#D1D5DB] bg-[#F8F9FB] px-4 py-8 text-center transition-colors hover:border-[#B48A2C] hover:bg-[#FFFBF5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white">
                    <Icon name="Upload" size={18} className="text-[#A68231]" />
                  </span>
                  <span className="text-sm font-semibold text-[#334155]">
                    {imageUploading ? "Uploading…" : "Upload hero image"}
                  </span>
                  <span className="text-xs text-gray-400">JPG, PNG, GIF, or WebP</span>
                </button>
              )}

              {imageUploadError && (
                <p className="mt-2 text-xs text-[#B91C1C]">{imageUploadError}</p>
              )}
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
          className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm border-transparent"
          style={{ backgroundColor: GOLD, color: "#fff" }}
        >
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Page" : "Create Page"}
        </Button>
      </div>
    </form>
  );
}
