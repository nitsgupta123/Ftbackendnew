"use client";

import { useEffect, useState } from "react";
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
import { NativeSelect } from "@/components/ui/native-select";
const CATEGORY_LANDING_OPTIONS = ["Family holidays", "Couples holidays", "First-time travellers", "Muslim-friendly holidays", "Luxury travel", "Nature holidays", "Multi-generational trips", "Honeymoon", "Babymoon", "Retiree-friendly holidays", "Adventure trips", "School holiday trips", "Safari holidays", "Cruise holidays", "Wellness holidays", "Corporate incentive trips", "MICE travel", "Private tours", "Group tours", "City breaks", "Island escapes"];
const COUNTRY_OPTIONS = ["South Africa", "Kenya", "Tanzania", "United Arab Emirates", "Maldives", "Thailand", "Singapore", "Malaysia", "Indonesia", "Sri Lanka", "Turkey", "United Kingdom", "France", "Italy", "Spain", "United States", "Australia", "New Zealand", "India", "Japan"];
interface PackageBasicsFormProps extends StepFormBaseProps {
  onNext: (data: PackageBasicsValues) => void;
  onPrevious: () => void;
  initialData?: PackageBasicsValues;
}
function FeatureToggleCard({
  label,
  enabled,
  onChange
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3.5">
      <span className="text-sm font-semibold text-[#334155]">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-medium ${enabled ? "text-[#27AE60]" : "text-gray-400"}`}>
          
          {enabled ? "Yes" : "No"}
        </span>
        <Button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)} className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
            ${enabled ? "bg-[#27AE60]" : "bg-[#CBD5E1]"}
          `}>
          
          <span className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
              ${enabled ? "translate-x-6" : "translate-x-1"}
            `} />
          
        </Button>
      </div>
    </div>;
}
function CategoryChipSelector({
  label,
  options,
  selectedIds,
  onChange,
  helperText,
  loading
}: {
  label: string;
  options: {
    id: number;
    name: string;
  }[];
  selectedIds: number[];
  onChange: (ids: number[], names: string[]) => void;
  helperText?: string;
  loading?: boolean;
}) {
  const toggleChip = (id: number) => {
    if (selectedIds.includes(id)) {
      const nextIds = selectedIds.filter(item => item !== id);
      const nextNames = options.filter(o => nextIds.includes(o.id)).map(o => o.name);
      onChange(nextIds, nextNames);
    } else {
      const nextIds = [...selectedIds, id];
      const nextNames = options.filter(o => nextIds.includes(o.id)).map(o => o.name);
      onChange(nextIds, nextNames);
    }
  };
  return <div>
      <p className="text-sm font-semibold text-[#334155] mb-2.5">{label}</p>
      {loading ? <p className="text-xs text-gray-400">Loading categories…</p> : options.length === 0 ? <p className="text-xs text-gray-400">
          No active categories. Add categories in Package Categories first.
        </p> : <div className="flex flex-wrap gap-2">
          {options.map(option => {
        const isSelected = selectedIds.includes(option.id);
        return <Button key={option.id} type="button" onClick={() => toggleChip(option.id)} className={`
                  px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all duration-200
                  ${isSelected ? "bg-[#1F2A44] text-white border-[#1F2A44]" : "bg-white text-[#334155] border-[#D1D5DB] hover:border-[#94A3B8]"}
                `}>
              
                {option.name}
              </Button>;
      })}
        </div>}
      {helperText && <p className="text-xs text-gray-400 mt-2.5">{helperText}</p>}
    </div>;
}
function ChipSelector({
  label,
  options,
  selected,
  onChange,
  helperText
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  helperText?: string;
}) {
  const toggleChip = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };
  return <div>
      <p className="text-sm font-semibold text-[#334155] mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
        const isSelected = selected.includes(option);
        return <Button key={option} type="button" onClick={() => toggleChip(option)} className={`
                px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all duration-200
                ${isSelected ? "bg-[#1F2A44] text-white border-[#1F2A44]" : "bg-white text-[#334155] border-[#D1D5DB] hover:border-[#94A3B8]"}
              `}>
              
              {option}
            </Button>;
      })}
      </div>
      {helperText && <p className="text-xs text-gray-400 mt-2.5">{helperText}</p>}
    </div>;
}
export default function PackageBasicsForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false
}: PackageBasicsFormProps) {
  const [categoryOptions, setCategoryOptions] = useState<{
    id: number;
    name: string;
  }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: {
      errors
    }
  } = useForm<PackageBasicsValues>({
    resolver: zodResolver(packageBasicsSchema),
    defaultValues: {
      packageTitle: "",
      slug: "",
      shortIntro: "",
      packageMode: "Enquiry first",
      tourType: "Group tour",
      runs: "Every day",
      countriesCovered: "",
      citiesOrRegions: "",
      startingPoint: "",
      endingPoint: "",
      days: "",
      nights: "",
      categories: [],
      categoryIds: [],
      landingPages: [],
      domesticFlightsIncluded: false,
      trainIncluded: false,
      transfersIncluded: true,
      isSeasonalPackage: false
    }
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
          setCategoryOptions(result.categories.map(c => ({
            id: c.id,
            name: c.name
          })));
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
  const packageTitleRegister = register("packageTitle");
  const onSubmit = (data: PackageBasicsValues) => {
    onNext(data);
  };
  const inputClass = "w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const labelClass = "block text-sm font-semibold text-[#334155] mb-1.5";
  const requiredStar = <span className="text-red-400 ml-0.5">*</span>;
  const errorClass = "text-xs text-red-500 mt-1";
  return <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#1F2A44]">Package Basics</h2>
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6]" title="Package structure, category, route and season logic">
              
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
          <Input id="packageTitle" type="text" className={inputClass} {...packageTitleRegister} onChange={e => {
          packageTitleRegister.onChange(e);
          setValue("slug", slugify(e.target.value), {
            shouldValidate: true,
            shouldDirty: true
          });
        }} />
          
          {errors.packageTitle && <p className={errorClass}>{errors.packageTitle.message}</p>}
        </div>

        {/* Slug */}
        <div className="mb-5">
          <Label htmlFor="slug" className={labelClass}>
            Slug {requiredStar}
          </Label>
          <Input id="slug" type="text" readOnly placeholder="south-africa-safari-cape-town-family-safari-t" className={`${inputClass} bg-[#F9FAFB] text-gray-500 cursor-not-allowed`} {...register("slug")} />
          
          {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
        </div>

        {/* Short intro + Package mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-2">
          <div>
            <Label htmlFor="shortIntro" className={labelClass}>
              Short intro line
            </Label>
            <Input id="shortIntro" type="text" placeholder="A short package description for listing cards" className={inputClass} {...register("shortIntro")} />
            
          </div>

          <div>
            <Label htmlFor="packageMode" className={labelClass}>
              Package mode
            </Label>
            <div className="relative">
              <NativeSelect id="packageMode" className={selectClass} {...register("packageMode")}>
                
                <option value="Enquiry first">Enquiry first</option>
                <option value="Book now">Book now</option>
                <option value="Fixed departure">Fixed departure</option>
                <option value="Customizable">Customizable</option>
                <option value="Private">Private</option>
              </NativeSelect>
              <Icon name="ChevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              
            </div>
            {errors.packageMode && <p className={errorClass}>{errors.packageMode.message}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          This appears on category pages, related package sections and package
          cards where clients only see a short description before clicking in.
        </p>

        {/* Tour type + Runs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
          <div>
            <Label htmlFor="tourType" className={labelClass}>
              Tour type {requiredStar}
            </Label>
            <div className="relative">
              <NativeSelect id="tourType" className={selectClass} {...register("tourType")}>
                
                <option value="">Select type</option>
                <option value="Leisure">Leisure</option>
                <option value="Adventure">Adventure</option>
                <option value="Safari">Safari</option>
                <option value="Honeymoon">Honeymoon</option>
                <option value="Family">Family</option>
                <option value="Cruise">Cruise</option>
                <option value="MICE">MICE</option>
              </NativeSelect>
              <Icon name="ChevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              
            </div>
            {errors.tourType && <p className={errorClass}>{errors.tourType.message}</p>}
          </div>

          <div>
            <Label htmlFor="runs" className={labelClass}>
              Runs
            </Label>
            <div className="relative">
              <NativeSelect id="runs" className={selectClass} {...register("runs")}>
                <option value="Every day">Every day</option>
                <option value="Weekly">Weekly</option>
                <option value="Fixed dates">Fixed dates</option>
                <option value="On request">On request</option>
              </NativeSelect>
              <Icon name="ChevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              
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
            <NativeSelect id="countriesCovered" className={selectClass} {...register("countriesCovered")}>
              
              <option value="">Add country</option>
              {COUNTRY_OPTIONS.map(country => <option key={country} value={country}>
                  {country}
                </option>)}
            </NativeSelect>
            <Icon name="ChevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            
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
            <Input id="citiesOrRegions" type="text" placeholder="Cape Town, Kruger" className={inputClass} {...register("citiesOrRegions")} />
            
          </div>

          <div>
            <Label htmlFor="startingPoint" className={labelClass}>
              Starting point
            </Label>
            <Input id="startingPoint" type="text" placeholder="Usually first city/country" className={inputClass} {...register("startingPoint")} />
            
          </div>

          <div>
            <Label htmlFor="endingPoint" className={labelClass}>
              Ending point
            </Label>
            <Input id="endingPoint" type="text" placeholder="Usually final city/country" className={inputClass} {...register("endingPoint")} />
            
          </div>
        </div>

        {/* Days & Nights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
          <div>
            <Label htmlFor="days" className={labelClass}>
              Days
            </Label>
            <Input id="days" type="number" min="1" className={inputClass} {...register("days")} />
            
          </div>

          <div>
            <Label htmlFor="nights" className={labelClass}>
              Nights
            </Label>
            <Input id="nights" type="number" min="0" className={inputClass} {...register("nights")} />
            
          </div>
        </div>

        {/* Package categories */}
        <div className="mb-6">
          <Controller control={control} name="categoryIds" render={({
          field
        }) => <CategoryChipSelector label="Package categories" options={categoryOptions} selectedIds={field.value || []} loading={categoriesLoading} onChange={(ids, names) => {
          field.onChange(ids);
          setValue("categories", names);
        }} helperText="Select one or more categories. Inactive categories are not shown on the customer website." />} />
          
        </div>

        {/* Landing pages */}
        <div className="mb-6">
          <Controller control={control} name="landingPages" render={({
          field
        }) => <ChipSelector label="Landing pages" options={CATEGORY_LANDING_OPTIONS} selected={field.value || []} onChange={field.onChange} helperText="Optional merchandising landing pages beyond managed categories." />} />
          
        </div>

        {/* Feature toggles — three cards in a row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Controller control={control} name="domesticFlightsIncluded" render={({
          field
        }) => <FeatureToggleCard label="Domestic flights included" enabled={field.value} onChange={field.onChange} />} />
          
          <Controller control={control} name="trainIncluded" render={({
          field
        }) => <FeatureToggleCard label="Train included" enabled={field.value} onChange={field.onChange} />} />
          
          <Controller control={control} name="transfersIncluded" render={({
          field
        }) => <FeatureToggleCard label="Transfers included" enabled={field.value} onChange={field.onChange} />} />
          
        </div>

        {/* Seasonal package — highlighted box */}
        <div className="mb-6 rounded-[10px] border border-[#FEF3C7] bg-[#FFFBEB] p-3">
          <Controller control={control} name="isSeasonalPackage" render={({
          field
        }) => <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3.5">
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
                  <span className={`text-sm font-medium ${field.value ? "text-[#27AE60]" : "text-[#64748B]"}`}>
                  
                    {field.value ? "Yes" : "No"}
                  </span>
                  <Button type="button" role="switch" aria-checked={field.value} onClick={() => field.onChange(!field.value)} className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
                      ${field.value ? "bg-[#27AE60]" : "bg-[#CBD5E1]"}
                    `}>
                  
                    <span className={`
                        inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
                        ${field.value ? "translate-x-6" : "translate-x-1"}
                      `} />
                  
                  </Button>
                </div>
              </div>} />
          
        </div>

        {/* Bottom action bar */}
        <div className="mt-8 pt-5 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3">
          <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
            
            <Icon name="ChevronLeft" size={16} />
            Previous
          </Button>

          <p className="text-xs text-gray-400 text-center flex-1">
            Save as you go. Incomplete sections stay as draft.
          </p>

          <Button type="submit" disabled={isSaving} className={stepSaveButtonClass}>
            
            {saveButtonLabel(isSaving)}
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </form>
    </div>;
}
