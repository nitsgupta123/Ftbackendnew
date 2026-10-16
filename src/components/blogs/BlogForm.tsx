import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import { createBlogPostSchema, type CreateBlogPostFormValues } from "@/lib/validation";
import { fromDatetimeLocalValue, toDatetimeLocalValue, toValidDate } from "@/lib/format-date";
import { slugify } from "@/lib/slug";
import type { BlogPostRecord } from "@/lib/blog-types";
import { listActiveBlogCategories } from "@/lib/blog-category-api";
import type { BlogCategoryRecord } from "@/lib/blog-category-types";
import { listPackages } from "@/lib/package-api";
import type { PackageRecord } from "@/lib/package-types";
import { uploadMediaFile } from "@/lib/media-api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import BlogRichTextEditor from "@/components/blogs/BlogRichTextEditor";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { resolveMediaSrc } from "@/lib/package-images";

const GOLD = "#A68231";
const MAX_RELATED_PACKAGES = 20;

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

function FeaturedToggleField({
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

export default function BlogForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: BlogFormProps) {
  const isEdit = Boolean(initialData);
  const [categories, setCategories] = useState<Pick<BlogCategoryRecord, "id" | "name">[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");
  const [tagsInput, setTagsInput] = useState(initialData?.tags.join(", ") ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);

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
      published_at: toDatetimeLocalValue(initialData?.published_at),
      seo_meta_title: initialData?.seo_meta_title ?? "",
      seo_meta_description: initialData?.seo_meta_description ?? "",
      tags: initialData?.tags ?? [],
      related_package_ids: initialData?.related_package_ids ?? [],
    },
  });

  const nameValue = useWatch({ control, name: "title" }) ?? "";
  const slugValue = useWatch({ control, name: "slug" }) ?? "";
  const featuredImagePath = useWatch({ control, name: "featured_image_path" }) ?? "";
  const statusValue = useWatch({ control, name: "status" }) ?? "draft";
  const relatedPackageIds = useWatch({ control, name: "related_package_ids" }) ?? [];
  const [slugTouched, setSlugTouched] = useState(false);

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
    listActiveBlogCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPackagesLoading(true);
    listPackages()
      .then((result) =>
        setPackages(result.packages.filter((pkg) => pkg.status !== "deleted"))
      )
      .catch(() => setPackages([]))
      .finally(() => setPackagesLoading(false));
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
        published_at: toDatetimeLocalValue(initialData.published_at),
        seo_meta_title: initialData.seo_meta_title ?? "",
        seo_meta_description: initialData.seo_meta_description ?? "",
        tags: initialData.tags,
        related_package_ids: initialData.related_package_ids ?? [],
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

  const selectedRelatedPackages = useMemo(() => {
    const byId = new Map(packages.map((pkg) => [pkg.id, pkg]));
    return relatedPackageIds.map((id) => {
      const pkg = byId.get(id);
      return {
        id,
        title: pkg?.package_title || `Package #${id}`,
      };
    });
  }, [packages, relatedPackageIds]);

  const packageChoices = useMemo(() => {
    const q = packageSearch.trim().toLowerCase();
    const selected = new Set(relatedPackageIds);
    return packages
      .filter((pkg) => pkg.status === "published")
      .filter((pkg) => !selected.has(pkg.id))
      .filter((pkg) => {
        if (!q) return true;
        const title = (pkg.package_title ?? "").toLowerCase();
        const slug = (pkg.slug ?? "").toLowerCase();
        return title.includes(q) || slug.includes(q) || String(pkg.id).includes(q);
      })
      .slice(0, 12);
  }, [packages, packageSearch, relatedPackageIds]);

  function toggleRelatedPackage(packageId: number) {
    const current = relatedPackageIds;
    if (current.includes(packageId)) {
      setValue(
        "related_package_ids",
        current.filter((id) => id !== packageId),
        { shouldDirty: true, shouldValidate: true }
      );
      return;
    }
    if (current.length >= MAX_RELATED_PACKAGES) {
      window.alert(`You can link at most ${MAX_RELATED_PACKAGES} related packages.`);
      return;
    }
    setValue("related_package_ids", [...current, packageId], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function handleFormSubmit(data: CreateBlogPostFormValues) {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const publishedAt = fromDatetimeLocalValue(data.published_at);
    const requestedStatus = data.status ?? "draft";
    const publishDate = toValidDate(publishedAt);
    const status =
      requestedStatus === "published" && publishDate && publishDate.getTime() > Date.now()
        ? "scheduled"
        : requestedStatus;
    await onSubmit({
      ...data,
      title: data.title.trim(),
      slug: data.slug?.trim() || undefined,
      excerpt: data.excerpt?.trim() || null,
      content: data.content || null,
      featured_image_path: data.featured_image_path?.trim() || null,
      author_name: data.author_name?.trim() || null,
      category_id: data.category_id ?? null,
      status,
      published_at: publishedAt,
      tags,
      related_package_ids: data.related_package_ids ?? [],
    });
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit, (formErrors) => {
        const first = Object.values(formErrors)[0];
        const message =
          first && typeof first === "object" && "message" in first && first.message
            ? String(first.message)
            : "Please fix the highlighted fields before saving.";
        const titleEl = document.getElementById("title");
        titleEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.alert(message);
      })}
      className="space-y-6"
    >
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
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <BlogRichTextEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Write your blog content. HTML is supported."
                />
              )}
            />
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#1F2A44]">Related Packages</h3>
              <p className="mt-1 text-xs text-gray-400">
                Link published packages shown with this blog post (max {MAX_RELATED_PACKAGES}).
              </p>
            </div>

            {selectedRelatedPackages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedRelatedPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => toggleRelatedPackage(pkg.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FFFCF7] px-3 py-1.5 text-xs font-medium text-[#334155] hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    title="Remove package"
                  >
                    <span className="max-w-[200px] truncate">{pkg.title}</span>
                    <Icon name="X" size={12} />
                  </button>
                ))}
              </div>
            )}

            <div>
              <Input
                type="search"
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                placeholder="Search packages by title or slug…"
                className={inputClass}
              />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#E5E7EB] divide-y divide-[#F1F5F9]">
              {packagesLoading ? (
                <p className="px-3 py-4 text-xs text-gray-400">Loading packages…</p>
              ) : packageChoices.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-400">
                  {packageSearch.trim()
                    ? "No matching packages found."
                    : relatedPackageIds.length
                      ? "All matching packages are already selected."
                      : "No published packages available."}
                </p>
              ) : (
                packageChoices.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => toggleRelatedPackage(pkg.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#FFFCF7] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1F2A44] truncate">
                        {pkg.package_title || `Package #${pkg.id}`}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {pkg.slug ? `/${pkg.slug}` : `#${pkg.id}`}
                      </p>
                    </div>
                    <Icon name="Plus" size={14} className="shrink-0 text-[#A68231]" />
                  </button>
                ))
              )}
            </div>
            {errors.related_package_ids && (
              <p className="text-xs text-red-600">{errors.related_package_ids.message}</p>
            )}
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
                <option value="pending_review">Pending Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </NativeSelect>
              {statusValue === "pending_review" && (
                <p className="mt-1 text-xs text-gray-400">
                  Submitted for approval. An approver can publish or return it to draft.
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="category_id"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Category
              </Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <NativeSelect
                    id="category_id"
                    className={inputClass}
                    value={field.value == null ? "" : String(field.value)}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? null : Number(value));
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  >
                    <option value="">No category</option>
                    {field.value != null &&
                      !categories.some((cat) => cat.id === field.value) && (
                        <option value={String(field.value)}>
                          {initialData?.category_id === field.value && initialData?.category_name
                            ? `${initialData.category_name} (inactive)`
                            : `Category #${field.value}`}
                        </option>
                      )}
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              />
              {errors.category_id && (
                <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>
              )}
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
                <FeaturedToggleField
                  label="Featured Post"
                  enabled={field.value ?? false}
                  onChange={field.onChange}
                />
              )}
            />

            <div>
              <Label
                htmlFor="published_at"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Schedule publish (SGT)
                {statusValue === "scheduled" && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                id="published_at"
                type="datetime-local"
                className={inputClass}
                {...register("published_at", {
                  onChange: (event) => {
                    const value = String(event.target.value ?? "");
                    const publishDate = toValidDate(fromDatetimeLocalValue(value));
                    if (
                      publishDate &&
                      publishDate.getTime() > Date.now() &&
                      (statusValue === "published" || statusValue === "draft")
                    ) {
                      setValue("status", "scheduled", { shouldDirty: true });
                    }
                  },
                })}
              />
              <p className="mt-1 text-xs text-gray-400">
                {statusValue === "scheduled"
                  ? "Required. Cron will publish this post automatically at this Singapore (SGT) time. It will appear under Scheduled Posts."
                  : statusValue === "published"
                    ? "Times are Singapore (SGT). Leave blank to publish now. A future date switches status to Scheduled."
                    : "Times are Singapore (SGT). Pick a future date/time to auto-set status to Scheduled for auto-publish."}
              </p>
              {errors.published_at && (
                <p className="mt-1 text-xs text-red-600">{errors.published_at.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-4">
            <h3 className="text-sm font-bold text-[#1F2A44]">Media & Tags</h3>

            <div>
              <Label className="block text-sm font-semibold text-[#334155] mb-1.5">
                Featured Image
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
                      src={resolveMediaSrc(featuredImagePath)}
                      alt="Featured preview"
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
                    {imageUploading ? "Uploading…" : "Upload featured image"}
                  </span>
                  <span className="text-xs text-gray-400">JPG, PNG, GIF, or WebP</span>
                </button>
              )}

              {imageUploadError && (
                <p className="mt-2 text-xs text-[#B91C1C]">{imageUploadError}</p>
              )}
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
          className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm border-transparent"
          style={{ backgroundColor: GOLD, color: "#fff" }}
        >
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Post" : "Create Post"}
        </Button>
      </div>
    </form>
  );
}
