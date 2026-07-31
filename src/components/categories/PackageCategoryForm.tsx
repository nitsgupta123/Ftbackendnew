"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import { createCategorySchema, type CreateCategoryFormValues } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import type { PackageCategoryRecord } from "@/lib/category-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
const inputClass = "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass = "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";
interface PackageCategoryFormProps {
  initialData?: PackageCategoryRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreateCategoryFormValues) => Promise<void>;
  onCancel: () => void;
}

function FeaturedCategoryToggle({
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

export default function PackageCategoryForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel
}: PackageCategoryFormProps) {
  const isEdit = Boolean(initialData);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: {
      errors
    }
  } = useForm<CreateCategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      icon_path: initialData?.icon_path ?? "",
      image_path: initialData?.image_path ?? "",
      display_order: initialData?.display_order ?? 0,
      status: initialData?.status ?? "active",
      is_featured: initialData?.is_featured ?? false,
      seo_meta_title: initialData?.seo_meta_title ?? "",
      seo_meta_description: initialData?.seo_meta_description ?? ""
    }
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
        icon_path: initialData.icon_path ?? "",
        image_path: initialData.image_path ?? "",
        display_order: initialData.display_order,
        status: initialData.status,
        is_featured: initialData.is_featured,
        seo_meta_title: initialData.seo_meta_title ?? "",
        seo_meta_description: initialData.seo_meta_description ?? ""
      });
      queueMicrotask(() => {
        setSlugTouched(true);
      });
    }
  }, [initialData, reset]);
  useEffect(() => {
    if (!slugTouched && nameValue && !isEdit) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, slugTouched, setValue, isEdit]);
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Category Name <span className="text-red-500">*</span>
          </Label>
          <Input id="name" className={inputClass} {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="slug" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Category Slug <span className="text-red-500">*</span>
          </Label>
          <Input id="slug" className={inputClass} {...register("slug", {
          onChange: () => setSlugTouched(true)
        })} />
          
          <p className="mt-1 text-xs text-gray-400">
            Auto-generated from name. Example: honeymoon-packages
          </p>
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="block text-sm font-semibold text-[#334155] mb-1.5">
          Category Description
        </Label>
        <Textarea id="description" className={textareaClass} {...register("description")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="icon_path" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Category Icon (URL or path)
          </Label>
          <Input id="icon_path" className={inputClass} {...register("icon_path")} placeholder="/icons/beach.svg" />
        </div>
        <div>
          <Label htmlFor="image_path" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Category Image (URL or path)
          </Label>
          <Input id="image_path" className={inputClass} {...register("image_path")} placeholder="/images/categories/beach.jpg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="display_order" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Display Order
          </Label>
          <Input id="display_order" type="number" min="0" className={inputClass} {...register("display_order", {
          valueAsNumber: true
        })} />
          
          {errors.display_order && <p className="mt-1 text-xs text-red-600">{errors.display_order.message}</p>}
        </div>

        <div>
          <Label htmlFor="status" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Status
          </Label>
          <NativeSelect id="status" className={inputClass} {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </div>

        <Controller control={control} name="is_featured" render={({
        field
      }) => <FeaturedCategoryToggle label="Featured Category" enabled={field.value ?? false} onChange={field.onChange} />} />
        
      </div>

      <div className="border-t border-[#E5E7EB] pt-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-3">SEO</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="seo_meta_title" className="block text-sm font-semibold text-[#334155] mb-1.5">
              SEO Meta Title
            </Label>
            <Input id="seo_meta_title" className={inputClass} {...register("seo_meta_title")} />
          </div>
          <div>
            <Label htmlFor="seo_meta_description" className="block text-sm font-semibold text-[#334155] mb-1.5">
              SEO Meta Description
            </Label>
            <Textarea id="seo_meta_description" className={textareaClass} {...register("seo_meta_description")} />
            
          </div>
        </div>
      </div>

      {slugValue && <p className="text-xs text-gray-400">
          Preview URL slug: <span className="font-mono text-gray-600">{slugValue}</span>
        </p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} disabled={isSaving} className="h-11 px-5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 disabled:opacity-50">
          
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Category" : "Create Category"}
        </Button>
      </div>
    </form>;
}
