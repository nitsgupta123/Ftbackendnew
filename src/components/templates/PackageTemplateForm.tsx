import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import {
  createPackageTemplateSchema,
  type CreatePackageTemplateFormValues,
} from "@/lib/validation";
import { slugify } from "@/lib/slug";
import {
  TEMPLATE_STEP_OPTIONS,
  type PackageTemplateRecord,
} from "@/lib/package-template-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass =
  "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";

interface PackageTemplateFormProps {
  initialData?: PackageTemplateRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreatePackageTemplateFormValues) => Promise<void>;
  onCancel: () => void;
}

function TemplateToggleField({
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

export default function PackageTemplateForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: PackageTemplateFormProps) {
  const isEdit = Boolean(initialData);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePackageTemplateFormValues>({
    resolver: zodResolver(createPackageTemplateSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      template_type: initialData?.template_type ?? "partial",
      included_steps: initialData?.included_steps ?? [2, 7, 8],
      display_order: initialData?.display_order ?? 0,
      status: initialData?.status ?? "active",
      is_default: initialData?.is_default ?? false,
    },
  });

  const nameValue = useWatch({ control, name: "name" }) ?? "";
  const slugValue = useWatch({ control, name: "slug" }) ?? "";
  const includedSteps = useWatch({ control, name: "included_steps" }) ?? [];
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description ?? "",
        template_type: initialData.template_type,
        included_steps: initialData.included_steps,
        display_order: initialData.display_order,
        status: initialData.status,
        is_default: initialData.is_default,
      });
      queueMicrotask(() => setSlugTouched(true));
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (!slugTouched && nameValue && !isEdit) {
      setValue("slug", slugify(nameValue));
    }
  }, [nameValue, slugTouched, setValue, isEdit]);

  useEffect(() => {
    if (includedSteps.length >= 8) {
      setValue("template_type", "full");
    } else if (includedSteps.length > 0) {
      setValue("template_type", "partial");
    }
  }, [includedSteps, setValue]);

  function toggleStep(step: number, checked: boolean) {
    const current = new Set(includedSteps);
    if (checked) {
      current.add(step);
    } else {
      current.delete(step);
    }
    setValue(
      "included_steps",
      [...current].sort((a, b) => a - b),
      { shouldValidate: true }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Template Name <span className="text-red-500">*</span>
          </Label>
          <Input id="name" className={inputClass} {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="slug" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Slug
          </Label>
          <Input
            id="slug"
            className={inputClass}
            {...register("slug", {
              onChange: () => setSlugTouched(true),
            })}
          />
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="block text-sm font-semibold text-[#334155] mb-1.5">
          Description
        </Label>
        <Textarea
          id="description"
          className={textareaClass}
          placeholder="Describe when to use this template and what it pre-fills…"
          {...register("description")}
        />
      </div>

      <div className="border border-[#E5E7EB] rounded-xl p-4 bg-[#F9FAFB]/50">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-1">Included Wizard Steps</h3>
        <p className="text-xs text-gray-500 mb-4">
          Select which package wizard sections this template pre-fills when applied.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATE_STEP_OPTIONS.map((option) => {
            const checked = includedSteps.includes(option.step);
            return (
              <label
                key={option.step}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  checked
                    ? "border-[#B48A2C]/40 bg-[#B48A2C]/5"
                    : "border-[#E5E7EB] bg-white hover:bg-gray-50"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleStep(option.step, value === true)}
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{option.step}.</span> {option.label}
                </span>
              </label>
            );
          })}
        </div>
        {errors.included_steps && (
          <p className="mt-2 text-xs text-red-600">{errors.included_steps.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="template_type" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Template Type
          </Label>
          <NativeSelect id="template_type" className={inputClass} {...register("template_type")}>
            <option value="partial">Partial</option>
            <option value="full">Full</option>
          </NativeSelect>
        </div>

        <div>
          <Label htmlFor="display_order" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Display Order
          </Label>
          <Input
            id="display_order"
            type="number"
            min="0"
            className={inputClass}
            {...register("display_order", { valueAsNumber: true })}
          />
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
      </div>

      <Controller
        control={control}
        name="is_default"
        render={({ field }) => (
          <TemplateToggleField
            label="Set as default template"
            enabled={field.value ?? false}
            onChange={field.onChange}
          />
        )}
      />

      {slugValue && (
        <p className="text-xs text-gray-400">
          Preview slug: <span className="font-mono text-gray-600">{slugValue}</span>
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
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
          {isSaving ? "Saving…" : isEdit ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
