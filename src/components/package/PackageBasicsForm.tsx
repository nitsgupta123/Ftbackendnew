"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "../ui/icons";
import { packageBasicsSchema, type PackageBasicsValues } from "@/lib/validation";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { listActiveCategories } from "@/lib/category-api";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CATEGORY_LANDING_OPTIONS = [
  "Family holidays",
  "Couples holidays",
  "First-time travellers",
  "Muslim-friendly holidays",
  "Luxury travel",
  "Nature holidays",
  "Multi-generational trips",
  "Honeymoon",
  "Babymoon",
  "Retiree-friendly holidays",
  "Adventure trips",
  "School holiday trips",
  "Safari holidays",
  "Cruise holidays",
  "Wellness holidays",
  "Corporate incentive trips",
  "MICE travel",
  "Private tours",
  "Group tours",
  "City breaks",
  "Island escapes",
];
const COUNTRY_OPTIONS = [
  "South Africa",
  "Kenya",
  "Tanzania",
  "United Arab Emirates",
  "Maldives",
  "Thailand",
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Sri Lanka",
  "Turkey",
  "United Kingdom",
  "France",
  "Italy",
  "Spain",
  "United States",
  "Australia",
  "New Zealand",
  "India",
  "Japan",
];

const SHORT_INTRO_HELP =
  "This appears on category pages, related package sections and package cards where clients only see a short description before clicking in.";

interface PackageBasicsFormProps extends StepFormBaseProps {
  onNext: (data: PackageBasicsValues) => void;
  onPrevious: () => void;
  initialData?: PackageBasicsValues;
}

function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6] hover:bg-[#BFDBFE] transition-colors"
          aria-label="Field help"
        >
          <Icon name="Info" size={11} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function SelectedTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#1F2A44] bg-[#1F2A44] px-2.5 py-1 text-xs font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/20 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <Icon name="X" size={12} />
      </button>
    </span>
  );
}

function SearchableMultiSelect({
  label,
  options,
  selectedValues,
  onChange,
  helperText,
  loading,
  placeholder = "Search and select…",
  emptyMessage = "No options found.",
}: {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  helperText?: string;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return selectedValues.map((v) => ({
      value: v,
      label: map.get(v) ?? v,
    }));
  }, [options, selectedValues]);

  const toggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selectedValues.filter((item) => item !== value));
  };

  return (
    <div>
      <p className="text-sm font-semibold text-[#334155] mb-2.5">{label}</p>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {selectedLabels.map((item) => (
            <SelectedTag
              key={item.value}
              label={item.label}
              onRemove={() => remove(item.value)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              className="w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-left font-normal text-gray-500 hover:bg-[#F9FAFB] justify-between"
            >
              <span className="truncate">
                {selectedValues.length > 0
                  ? `${selectedValues.length} selected`
                  : placeholder}
              </span>
              <Icon name="ChevronDown" size={16} className="text-gray-400 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] p-2 bg-white"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              searchRef.current?.focus();
            }}
          >
            <div className="relative mb-2">
              <Icon
                name="Search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-9 pl-8 pr-3 text-sm border-[#D1D5DB] rounded-[6px]"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-xs text-gray-400">{emptyMessage}</p>
              ) : (
                filtered.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className={`
                        w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left rounded-[6px] transition-colors
                        ${isSelected ? "bg-[#F1F5F9] text-[#1F2A44] font-medium" : "text-[#334155] hover:bg-[#F8FAFC]"}
                      `}
                    >
                      <span
                        className={`
                          flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]
                          ${isSelected ? "border-[#1F2A44] bg-[#1F2A44] text-white" : "border-[#CBD5E1] bg-white"}
                        `}
                      >
                        {isSelected ? "✓" : null}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {helperText && <p className="text-xs text-gray-400 mt-2.5">{helperText}</p>}
    </div>
  );
}

export default function PackageBasicsForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: PackageBasicsFormProps) {
  const [categoryOptions, setCategoryOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PackageBasicsValues>({
    resolver: zodResolver(packageBasicsSchema),
    defaultValues: {
      packageTitle: "",
      slug: "",
      shortIntro: "",
      packageMode: "Enquiry first",
      tourType: "Group tour",
      runs: "Every day",
      runsCustom: "",
      countriesCovered: "",
      citiesOrRegions: "",
      startingPoint: "",
      endingPoint: "",
      days: "",
      nights: "",
      categories: [],
      categoryIds: [],
      landingPages: [],
      isSeasonalPackage: false,
      importantInfo: "",
      frontendNotes: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const result = await listActiveCategories();
        if (!cancelled) {
          setCategoryOptions(
            result.categories.map((c) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        if (!cancelled) setCategoryOptions([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const categorySelectOptions = useMemo(
    () =>
      categoryOptions.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [categoryOptions]
  );

  const landingSelectOptions = useMemo(
    () => CATEGORY_LANDING_OPTIONS.map((name) => ({ value: name, label: name })),
    []
  );

  const packageTitleRegister = register("packageTitle");
  const onSubmit = (data: PackageBasicsValues) => {
    onNext(data);
  };

  const inputClass =
    "w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const labelClass = "block text-sm font-semibold text-[#334155] mb-1.5";
  const textareaClass =
    "w-full px-4 py-3 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const requiredStar = <span className="text-red-400 ml-0.5">*</span>;
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1F2A44]">Package Basics</h2>
              <span
                className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6]"
                title="Package structure, category, route and season logic"
              >
                <Icon name="Info" size={11} />
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Status now sits at the top beside Preview and Save Draft. This
              section is for package structure, category, route and season logic.
            </p>
          </div>

          {/* Fayyaz front-end package title */}
          <div className="mb-5">
            <Label htmlFor="packageTitle" className={labelClass}>
              Fayyaz front-end package title {requiredStar}
            </Label>
            <Input
              id="packageTitle"
              type="text"
              className={inputClass}
              {...packageTitleRegister}
              onChange={(e) => {
                packageTitleRegister.onChange(e);
                setValue("slug", slugify(e.target.value), {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
            {errors.packageTitle && (
              <p className={errorClass}>{errors.packageTitle.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="mb-5">
            <Label htmlFor="slug" className={labelClass}>
              Slug {requiredStar}
            </Label>
            <Input
              id="slug"
              type="text"
              readOnly
              placeholder="south-africa-safari-cape-town-family-safari-t"
              className={`${inputClass} bg-[#F9FAFB] text-gray-500 cursor-not-allowed`}
              {...register("slug")}
            />
            {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
          </div>

          {/* Short intro + Package mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Label htmlFor="shortIntro" className="text-sm font-semibold text-[#334155]">
                  Short intro line
                </Label>
                <FieldHelp text={SHORT_INTRO_HELP} />
              </div>
              <Input
                id="shortIntro"
                type="text"
                placeholder="A short package description for listing cards"
                className={inputClass}
                {...register("shortIntro")}
              />
            </div>

            <div>
              <Label htmlFor="packageMode" className={labelClass}>
                Package mode
              </Label>
              <div className="relative">
                <NativeSelect
                  id="packageMode"
                  className={selectClass}
                  {...register("packageMode")}
                >
                  <option value="Enquiry first">Enquiry first</option>
                  <option value="Book now">Book now</option>
                  <option value="Fixed departure">Fixed departure</option>
                  <option value="Customizable">Customizable</option>
                  <option value="Private">Private</option>
                </NativeSelect>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
              {errors.packageMode && (
                <p className={errorClass}>{errors.packageMode.message}</p>
              )}
            </div>
          </div>

          {/* Tour type + Runs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
            <div>
              <Label htmlFor="tourType" className={labelClass}>
                Tour type {requiredStar}
              </Label>
              <div className="relative">
                <NativeSelect
                  id="tourType"
                  className={selectClass}
                  {...register("tourType")}
                >
                  <option value="">Select type</option>
                  <option value="Leisure">Leisure</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Safari">Safari</option>
                  <option value="Honeymoon">Honeymoon</option>
                  <option value="Family">Family</option>
                  <option value="Cruise">Cruise</option>
                  <option value="MICE">MICE</option>
                </NativeSelect>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
              {errors.tourType && (
                <p className={errorClass}>{errors.tourType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="runs" className={labelClass}>
                Runs
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <NativeSelect
                    id="runs"
                    className={selectClass}
                    {...register("runs")}
                  >
                    <option value="Every day">Every day</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Fixed dates">Fixed dates</option>
                    <option value="On request">On request</option>
                  </NativeSelect>
                  <Icon
                    name="ChevronDown"
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
                <Input
                  id="runsCustom"
                  type="text"
                  placeholder="e.g. Every Monday, Twice Monthly"
                  className={inputClass}
                  {...register("runsCustom")}
                />
              </div>
              {errors.runs && <p className={errorClass}>{errors.runs.message}</p>}
            </div>
          </div>

          {/* Countries covered */}
          <div className="mb-5 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] p-4">
            <Label htmlFor="countriesCovered" className={labelClass}>
              Countries covered {requiredStar}
            </Label>
            <div className="relative">
              <NativeSelect
                id="countriesCovered"
                className={selectClass}
                {...register("countriesCovered")}
              >
                <option value="">Add country</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </NativeSelect>
              <Icon
                name="ChevronDown"
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Use this for single-country and multi-country packages.
            </p>
          </div>

          {/* Cities, Starting point, Ending point */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 mb-5">
            <div>
              <Label htmlFor="citiesOrRegions" className={labelClass}>
                Cities or regions
              </Label>
              <Input
                id="citiesOrRegions"
                type="text"
                placeholder="Cape Town, Kruger"
                className={inputClass}
                {...register("citiesOrRegions")}
              />
            </div>

            <div>
              <Label htmlFor="startingPoint" className={labelClass}>
                Starting point
              </Label>
              <Input
                id="startingPoint"
                type="text"
                placeholder="Usually first city/country"
                className={inputClass}
                {...register("startingPoint")}
              />
            </div>

            <div>
              <Label htmlFor="endingPoint" className={labelClass}>
                Ending point
              </Label>
              <Input
                id="endingPoint"
                type="text"
                placeholder="Usually final city/country"
                className={inputClass}
                {...register("endingPoint")}
              />
            </div>
          </div>

          {/* Days & Nights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
            <div>
              <Label htmlFor="days" className={labelClass}>
                Days
              </Label>
              <Input
                id="days"
                type="number"
                min="1"
                className={inputClass}
                {...register("days")}
              />
            </div>

            <div>
              <Label htmlFor="nights" className={labelClass}>
                Nights
              </Label>
              <Input
                id="nights"
                type="number"
                min="0"
                className={inputClass}
                {...register("nights")}
              />
            </div>
          </div>

          {/* Package categories */}
          <div className="mb-6">
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <SearchableMultiSelect
                  label="Package categories"
                  options={categorySelectOptions}
                  selectedValues={(field.value || []).map(String)}
                  loading={categoriesLoading}
                  placeholder="Search categories…"
                  emptyMessage={
                    categoryOptions.length === 0
                      ? "No active categories. Add categories in Package Categories first."
                      : "No matching categories."
                  }
                  onChange={(values) => {
                    const ids = values
                      .map((v) => Number(v))
                      .filter((id) => Number.isInteger(id) && id > 0);
                    const names = categoryOptions
                      .filter((o) => ids.includes(o.id))
                      .map((o) => o.name);
                    field.onChange(ids);
                    setValue("categories", names);
                  }}
                  helperText="Select one or more categories. Inactive categories are not shown on the customer website."
                />
              )}
            />
          </div>

          {/* Landing pages */}
          <div className="mb-6">
            <Controller
              control={control}
              name="landingPages"
              render={({ field }) => (
                <SearchableMultiSelect
                  label="Landing pages"
                  options={landingSelectOptions}
                  selectedValues={field.value || []}
                  onChange={field.onChange}
                  placeholder="Search landing pages…"
                  helperText="Optional merchandising landing pages beyond managed categories."
                />
              )}
            />
          </div>

          {/* Important Info + Frontend Notes */}
          <div className="grid grid-cols-1 gap-y-5 mb-6">
            <div>
              <Label htmlFor="importantInfo" className={labelClass}>
                Important Info
              </Label>
              <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">
                Rates subject to availability, visa not included, seasonal surcharge,
                physical requirements, booking conditions.
              </p>
              <Textarea
                id="importantInfo"
                placeholder="Enter important notes that will be visible to clients…"
                rows={4}
                className={textareaClass}
                {...register("importantInfo")}
              />
            </div>

            <div>
              <Label htmlFor="frontendNotes" className={labelClass}>
                Frontend Notes
              </Label>
              <Textarea
                id="frontendNotes"
                placeholder="Front-end summary or notes shown on the website…"
                rows={4}
                className={textareaClass}
                {...register("frontendNotes")}
              />
            </div>
          </div>

          {/* Seasonal package — highlighted box */}
          <div className="mb-6 rounded-[10px] border border-[#FEF3C7] bg-[#FFFBEB] p-3">
            <Controller
              control={control}
              name="isSeasonalPackage"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2A44]">
                      This is a seasonal package
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Controls visibility and enquiry behaviour outside the travel
                      season.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-sm font-medium ${field.value ? "text-[#27AE60]" : "text-[#64748B]"}`}
                    >
                      {field.value ? "Yes" : "No"}
                    </span>
                    <ToggleSwitch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                </div>
              )}
            />
          </div>

          {/* Bottom action bar */}
          <div className="mt-8 pt-5 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3">
            <Button
              type="button"
              onClick={onPrevious}
              className={stepPreviousButtonClass}
            >
              <Icon name="ChevronLeft" size={16} />
              Previous
            </Button>

            <p className="text-xs text-gray-400 text-center flex-1">
              Save as you go. Incomplete sections stay as draft.
            </p>

            <Button
              type="submit"
              disabled={isSaving}
              data-package-step-save="" className={stepSaveButtonClass}
            >
              {saveButtonLabel(isSaving)}
              <Icon name="ChevronRight" size={16} />
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
