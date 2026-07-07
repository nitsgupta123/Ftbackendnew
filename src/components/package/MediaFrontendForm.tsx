"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Icon } from "../ui/icons";
import type { MediaFrontendData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
interface MediaFrontendFormProps extends StepFormBaseProps {
  onNext: (data: MediaFrontendData) => void;
  onPrevious: () => void;
  initialData?: MediaFrontendData | null;
}
interface UploadCardProps {
  title: string;
  subtitle?: string;
}
function UploadCard({
  title,
  subtitle
}: UploadCardProps) {
  return <div className="bg-[#FFF0F3] border border-dashed border-[#F4C8D0] rounded-[12px] p-5 flex flex-col items-center text-center transition-shadow hover:shadow-md">
      <div className="w-12 h-12 rounded-full bg-white border border-[#F4C8D0] flex items-center justify-center mb-3 shadow-sm">
        <Icon name="Upload" size={20} className="text-[#C8485E]" />
      </div>
      <h4 className="text-sm font-semibold text-[#1F2A44] mb-1">{title}</h4>
      {subtitle && <p className="text-xs text-[#D47786] mb-4">{subtitle}</p>}
      <Button type="button" className="mt-auto px-5 py-2 text-xs font-semibold text-[#C8485E] bg-white border border-[#F4C8D0] rounded-[8px] hover:bg-[#FFF5F7] hover:border-[#C8485E] transition-colors shadow-sm">
        
        Upload image
      </Button>
    </div>;
}
interface ToolbarButtonProps {
  label: string;
  iconName?: string;
  active?: boolean;
  onClick?: () => void;
}
function ToolbarButton({
  label,
  iconName,
  active = false,
  onClick
}: ToolbarButtonProps) {
  return <Button type="button" onClick={onClick} className={`
        h-7 px-2.5 text-xs font-medium rounded-[6px] transition-all duration-150 border inline-flex items-center gap-1
        ${active ? "bg-[#1F2A44] text-white border-[#1F2A44] shadow-sm" : "bg-white text-gray-600 border-[#E5E7EB] hover:border-gray-400 hover:bg-gray-50"}
      `}>
      
      {iconName && <Icon name={iconName} size={13} />}
      {label}
    </Button>;
}
interface TextAreaWithToolbarProps {
  label: string;
  toolbarButtons: {
    label: string;
    iconName?: string;
    active?: boolean;
  }[];
  caption?: string;
  placeholder: string;
  rowCount?: number;
  value: string;
  onChange: (value: string) => void;
}
function TextAreaWithToolbar({
  label,
  toolbarButtons,
  caption,
  placeholder,
  rowCount = 5,
  value,
  onChange
}: TextAreaWithToolbarProps) {
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set(toolbarButtons.filter(b => b.active).map(b => b.label)));
  const toggleButton = (label: string) => {
    setActiveButtons(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };
  return <div>
      <Label className="block text-sm font-semibold text-[#1F2A44] mb-2">
        {label}
      </Label>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap border border-[#E5E7EB] rounded-t-[12px] bg-[#F8F9FB] px-3 py-2">
        {toolbarButtons.map(btn => <ToolbarButton key={btn.label} label={btn.label} iconName={btn.iconName} active={activeButtons.has(btn.label)} onClick={() => toggleButton(btn.label)} />)}
      </div>
      {/* Textarea */}
      <Textarea placeholder={placeholder} rows={rowCount} value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 text-sm border border-t-0 border-[#E5E7EB] rounded-b-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y" />
      
      {caption && <p className="text-xs text-gray-400 mt-1.5 italic">{caption}</p>}
    </div>;
}
export default function MediaFrontendForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false
}: MediaFrontendFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset
  } = useForm<MediaFrontendData>({
    defaultValues: {
      videoLink: "",
      priceDisplayType: "From price",
      primaryCta: "Book Now",
      secondaryCta: "Speak to a Travel Consultant",
      whatsappNumber: "6594314389",
      whatsappLink: "https://wa.me/6594314389?tex...",
      desktopHeroImage: null,
      mobileHeroImage: null,
      packageCardImage: null
    }
  });
  useEffect(() => {
    if (!initialData) return;
    reset(initialData);
  }, [initialData, reset]);
  const [frontEndSummary, setFrontEndSummary] = useState("");
  const [whyChooseThisPackage, setWhyChooseThisPackage] = useState("");
  const [clientFacingNotes, setClientFacingNotes] = useState("");
  const whatsappNumber = useWatch({ control, name: "whatsappNumber" }) ?? "";
  const onSubmit = (data: MediaFrontendData) => {
    onNext({
      ...data,
      whatsappLink: data.whatsappNumber ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}` : data.whatsappLink,
      frontEndSummary,
      whyChooseThisPackage,
      clientFacingNotes
    });
  };
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const mediaTags = ["Image source", "Alt text", "Hero image", "Mobile image"];
  const frontendToolbar = [{
    label: "B",
    iconName: "Bold",
    active: false
  }, {
    label: "Bullets",
    iconName: "List",
    active: false
  }, {
    label: "Brand gold",
    active: false
  }, {
    label: "Brand navy",
    active: false
  }];
  const whyChooseToolbar = [{
    label: "B",
    iconName: "Bold",
    active: false
  }, {
    label: "Bullets",
    iconName: "List",
    active: false
  }, {
    label: "Brand gold",
    active: false
  }];
  return <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in">
      {/* Card Header */}
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">
            Media & Front-End Display
          </h2>
          <Button type="button" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-gray-400 hover:bg-gray-300 hover:text-gray-500 transition-colors" title="Info">
            
            <span className="text-[11px] font-bold leading-none">i</span>
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Every image must have a source URL and alt text at upload point. CTA
          changes automatically based on price display.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {/* Media Guide Banner */}
        <div className="mb-6 p-5 rounded-[12px] bg-[#FFFDF5] border border-[#F0E4A8]">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="mt-0.5 shrink-0">
              <Icon name="Info" size={16} className="text-[#B48A2C]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6B5E1A] mb-1">
                Media guide
              </p>
              <p className="text-sm text-[#6B5E1A] leading-relaxed">
                Use supplier-owned images, licensed images, or images with clear
                permission. Do not upload images without a source. Alt text
                should describe the image naturally for accessibility and SEO.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {mediaTags.map(tag => <span key={tag} className="inline-flex items-center px-3 py-1 text-xs font-medium text-[#9E7D2A] border border-[#D4A83C] rounded-full">
              
                {tag}
              </span>)}
          </div>
        </div>

        {/* Upload Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <UploadCard title="Desktop hero image" subtitle="Required before publishing" />
          
          <UploadCard title="Mobile hero image" subtitle="Required before publishing" />
          
          <UploadCard title="Package card image" subtitle="Required before publishing" />
          
        </div>

        {/* Form Fields Grid - 2 Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
          {/* Video Link */}
          <div>
            <Label htmlFor="videoLink" className={labelClass}>
              Video link
            </Label>
            <Input id="videoLink" type="text" placeholder="Optional" className={inputClass} {...register("videoLink")} />
            
          </div>

          {/* Price Display Type */}
          <div>
            <Label htmlFor="priceDisplayType" className={labelClass}>
              Price display type
            </Label>
            <NativeSelect id="priceDisplayType" className={inputClass} {...register("priceDisplayType")}>
              
              <option value="From price">From price</option>
              <option value="Fixed price">Fixed price</option>
              <option value="On request">On request</option>
            </NativeSelect>
          </div>

          {/* Primary CTA */}
          <div>
            <Label htmlFor="primaryCta" className={labelClass}>
              Primary CTA
            </Label>
            <Input id="primaryCta" type="text" placeholder="e.g., Book Now" className={inputClass} {...register("primaryCta")} />
            
          </div>

          {/* Secondary CTA */}
          <div>
            <Label htmlFor="secondaryCta" className={labelClass}>
              Secondary CTA
            </Label>
            <Input id="secondaryCta" type="text" placeholder="e.g., Speak to a Travel Consultant" className={inputClass} {...register("secondaryCta")} />
            
          </div>

          {/* WhatsApp Number */}
          <div>
            <Label htmlFor="whatsappNumber" className={labelClass}>
              WhatsApp number
            </Label>
            <Input id="whatsappNumber" type="text" className={inputClass} {...register("whatsappNumber")} />
            
          </div>

          {/* Auto-generated WhatsApp Link */}
          <div>
            <Label htmlFor="whatsappLink" className={labelClass}>
              Auto-generated WhatsApp link
            </Label>
            <Input id="whatsappLink" type="text" className={`${inputClass} text-gray-400 bg-[#F8F9FB] font-mono text-xs`} value={whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}` : ""} readOnly />
            
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E5E7EB] my-6" />

        {/* Front-end summary */}
        <div className="mb-6">
          <TextAreaWithToolbar label="Front-end summary" toolbarButtons={frontendToolbar} caption="Formatting preview will appear here." placeholder="Formatting preview will appear here." value={frontEndSummary} onChange={setFrontEndSummary} />
          
        </div>

        {/* Divider */}
        <div className="border-t border-[#E5E7EB] my-6" />

        {/* Why choose this package */}
        <div className="mb-6">
          <TextAreaWithToolbar label="Why choose this package" toolbarButtons={whyChooseToolbar} placeholder="Write reasons why customers should choose this package..." value={whyChooseThisPackage} onChange={setWhyChooseThisPackage} />
          
        </div>

        {/* Divider */}
        <div className="border-t border-[#E5E7EB] my-6" />

        {/* Important client-facing notes */}
        <div className="mb-6">
          <Label className="block text-sm font-semibold text-[#1F2A44] mb-1">
            Important client-facing notes
          </Label>
          <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
            Rates subject to availability, visa not included, seasonal surcharge,
            physical requirements, booking conditions.
          </p>
          <Textarea placeholder="Enter important notes that will be visible to clients..." rows={5} value={clientFacingNotes} onChange={e => setClientFacingNotes(e.target.value)} className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y" />
          
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
