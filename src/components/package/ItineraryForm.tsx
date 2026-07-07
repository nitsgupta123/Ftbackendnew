"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";
import type { ItineraryData, ItineraryDay } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";import { Button } from "@/components/ui/button";import { Label } from "@/components/ui/label";import { Input } from "@/components/ui/input";import { Textarea } from "@/components/ui/textarea";

interface ItineraryFormProps extends StepFormBaseProps {
  onNext: (data: ItineraryData) => void;
  onPrevious: () => void;
  initialData?: ItineraryData | null;
}

function createEmptyDay(dayNumber: number): ItineraryDay {
  return {
    dayNumber,
    title: "",
    city: "",
    description: "",
    activitiesIncluded: "",
    optionalActivities: "",
    transport: "",
    hotelThatNight: "",
    internalNotes: "",
    supplierNotes: "",
    mobilityWarning: "",
    halalFoodNote: "",
    breakfast: false,
    lunch: false,
    dinner: false,
    guideIncluded: false,
    imageUrl: null
  };
}

/* -------------------------------------------------------------------------- */
/*  Reusable Mini ToggleSwitch                                                */
/* -------------------------------------------------------------------------- */
function ToggleBlock({
  label,
  enabled,
  onChange




}: {label: string;enabled: boolean;onChange: (value: boolean) => void;}) {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full border border-gray-200 bg-white">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <Button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0
          transition-colors duration-200 ease-in-out
          ${enabled ? "bg-[#A8832A]" : "bg-gray-300"}
        `}>
        
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
            ring-0 transition duration-200 ease-in-out
            ${enabled ? "translate-x-6" : "translate-x-1"}
          `} />
        
      </Button>
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Reusable PillTag                                                          */
/* -------------------------------------------------------------------------- */
function PillTag({ label }: {label: string;}) {
  return (
    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-[#A8832A] border border-[#A8832A]/40 rounded-full bg-[#FFF9EB]">
      {label}
    </span>);

}

/* -------------------------------------------------------------------------- */
/*  Toolbar Button                                                            */
/* -------------------------------------------------------------------------- */
function ToolbarButton({
  label,
  icon,
  active,
  onClick





}: {label: string;icon?: string;active: boolean;onClick: () => void;}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={`
        h-7 px-3 text-xs font-medium rounded-[6px] transition-colors border flex items-center gap-1.5
        ${
      active ?
      "bg-[#1F2A44] text-white border-[#1F2A44]" :
      "bg-white text-gray-600 border-[#E5E7EB] hover:border-gray-400"}
      `
      }>
      
      {icon && <Icon name={icon} size={12} />}
      {label}
    </Button>);

}

/* -------------------------------------------------------------------------- */
/*  Image Upload Box (Pink)                                                   */
/* -------------------------------------------------------------------------- */
function DayImageUpload() {
  return (
    <div className="bg-[#FFF0F3] border border-[#F4C8D0] rounded-[12px] p-5 flex flex-col items-center text-center h-full justify-center min-h-[140px]">
      <div className="w-12 h-12 rounded-full bg-white border border-[#F4C8D0] flex items-center justify-center mb-3">
        <Icon name="Upload" size={20} className="text-[#C8485E]" />
      </div>
      <h4 className="text-sm font-semibold text-[#C8485E] mb-1">Day image</h4>
      <p className="text-xs text-[#D47786] mb-4">
        Source & alt text required
      </p>
      <Button
        type="button"
        className="px-5 py-2 text-xs font-medium text-[#C8485E] bg-white border border-[#F4C8D0] rounded-[8px] hover:bg-[#FFF5F7] transition-colors">
        
        Upload image
      </Button>
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Day Card Component                                                        */
/* -------------------------------------------------------------------------- */
interface DayCardProps {
  day: ItineraryDay;
  onChange: (day: ItineraryDay) => void;
}

function DayCard({ day, onChange }: DayCardProps) {
  const [toolbarActive, setToolbarActive] = useState<Set<string>>(new Set());

  const update = (patch: Partial<ItineraryDay>) => {
    onChange({ ...day, ...patch });
  };

  const toggleToolbar = (label: string) => {
    setToolbarActive((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);else
      next.add(label);
      return next;
    });
  };

  const inputClass =
  "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";

  const textareaClass =
  "w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";

  const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";

  const toolbarButtons = [
  { label: "B", icon: "Bold" },
  { label: "Bullets", icon: "List" },
  { label: "Brand gold", icon: undefined },
  { label: "Brand navy", icon: undefined }];


  return (
    <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-[#FAFAFA]">
        <h3 className="text-base font-semibold text-[#1F2A44]">
          Day {day.dayNumber}
        </h3>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-5">
        {/* Row 1: Day title + City */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label className={labelClass}>Day title</Label>
            <Input
              type="text"
              placeholder="e.g., Arrival in Singapore"
              className={inputClass}
              value={day.title ?? ""}
              onChange={(e) => update({ title: e.target.value })} />
            
          </div>
          <div>
            <Label className={labelClass}>City</Label>
            <Input
              type="text"
              placeholder="e.g., Singapore"
              className={inputClass}
              value={day.city ?? ""}
              onChange={(e) => update({ city: e.target.value })} />
            
          </div>
        </div>

        {/* Client-facing description (full-width with toolbar) */}
        <div>
          <Label className={labelClass}>Client-facing description</Label>
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {toolbarButtons.map((btn) =>
            <ToolbarButton
              key={btn.label}
              label={btn.label}
              icon={btn.icon}
              active={toolbarActive.has(btn.label)}
              onClick={() => toggleToolbar(btn.label)} />

            )}
          </div>
          <Textarea
            placeholder="Describe this day for clients..."
            rows={5}
            className={textareaClass}
            value={day.description ?? ""}
            onChange={(e) => update({ description: e.target.value })} />
          
          <div className="mt-2 px-4 py-3 border border-dashed border-gray-300 rounded-[10px]">
            <p className="text-xs text-gray-400 text-center">
              Formatting preview will appear here.
            </p>
          </div>
        </div>

        {/* Row 2: Activities included + Optional activities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label className={labelClass}>Activities included</Label>
            <Textarea
              placeholder="List included activities..."
              rows={4}
              className={textareaClass}
              value={day.activitiesIncluded ?? ""}
              onChange={(e) => update({ activitiesIncluded: e.target.value })} />
            
          </div>
          <div>
            <Label className={labelClass}>Optional activities</Label>
            <Textarea
              placeholder="List optional activities..."
              rows={4}
              className={textareaClass}
              value={day.optionalActivities ?? ""}
              onChange={(e) => update({ optionalActivities: e.target.value })} />
            
          </div>
        </div>

        {/* Row 3: Transport + Hotel that night */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label className={labelClass}>Transport</Label>
            <Input
              type="text"
              placeholder="e.g., Private transfer"
              className={inputClass}
              value={day.transport ?? ""}
              onChange={(e) => update({ transport: e.target.value })} />
            
          </div>
          <div>
            <Label className={labelClass}>Hotel that night</Label>
            <Input
              type="text"
              placeholder="e.g., Marina Bay Sands"
              className={inputClass}
              value={day.hotelThatNight ?? ""}
              onChange={(e) => update({ hotelThatNight: e.target.value })} />
            
          </div>
        </div>

        {/* Image & Notes Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label className={labelClass}>Day image</Label>
            <DayImageUpload />
          </div>
          <div>
            <Label className={labelClass}>Internal consultant notes</Label>
            <Textarea
              placeholder="Notes visible only to consultants..."
              rows={6}
              className={textareaClass}
              value={day.internalNotes ?? ""}
              onChange={(e) => update({ internalNotes: e.target.value })} />
            
          </div>
        </div>

        {/* Row 4: Supplier notes + Mobility warning */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Label className={labelClass}>Supplier notes</Label>
            <Textarea
              placeholder="Supplier-specific information..."
              rows={4}
              className={textareaClass}
              value={day.supplierNotes ?? ""}
              onChange={(e) => update({ supplierNotes: e.target.value })} />
            
          </div>
          <div>
            <Label className={labelClass}>Mobility warning</Label>
            <Textarea
              placeholder="e.g., Uneven terrain, stairs..."
              rows={4}
              className={textareaClass}
              value={day.mobilityWarning ?? ""}
              onChange={(e) => update({ mobilityWarning: e.target.value })} />
            
          </div>
        </div>

        {/* Row 5: Halal food note */}
        <div>
          <Label className={labelClass}>Halal food note</Label>
          <Textarea
            placeholder="Halal food availability details..."
            rows={3}
            className={textareaClass}
            value={day.halalFoodNote ?? ""}
            onChange={(e) => update({ halalFoodNote: e.target.value })} />
          
        </div>

        {/* Inline Toggles */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <ToggleBlock
            label="Breakfast No"
            enabled={day.breakfast ?? false}
            onChange={(value) => update({ breakfast: value })} />
          
          <ToggleBlock
            label="Lunch No"
            enabled={day.lunch ?? false}
            onChange={(value) => update({ lunch: value })} />
          
          <ToggleBlock
            label="Dinner No"
            enabled={day.dinner ?? false}
            onChange={(value) => update({ dinner: value })} />
          
          <ToggleBlock
            label="Guide included No"
            enabled={day.guideIncluded ?? false}
            onChange={(value) => update({ guideIncluded: value })} />
          
        </div>
      </div>
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Main ItineraryForm Component                                              */
/* -------------------------------------------------------------------------- */
export default function ItineraryForm({
  onNext,
  onPrevious,
  isSaving = false
}: ItineraryFormProps) {
  const [days, setDays] = useState<ItineraryDay[]>([createEmptyDay(1)]);

  const addDay = () => {
    setDays((prev) => [...prev, createEmptyDay(prev.length + 1)]);
  };

  const updateDay = (index: number, day: ItineraryDay) => {
    setDays((prev) => prev.map((d, i) => i === index ? day : d));
  };

  const itineraryGuideTags = [
  "Client copy",
  "Supplier notes",
  "Meals",
  "Mobility warnings",
  "Halal food notes"];


  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================================== */}
      {/*  1. HEADER & INFO BANNER                                           */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Itinerary</h2>
          <Button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-gray-400 hover:bg-gray-300 hover:text-gray-500 transition-colors"
            title="Info">
            
            <span className="text-[11px] font-bold leading-none">i</span>
          </Button>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Each day has client-facing content plus internal notes. Day images
          also require source and alt text.
        </p>
      </div>

      {/* ================================================================== */}
      {/*  2. ITINERARY GUIDE BANNER (YELLOW)                                */}
      {/* ================================================================== */}
      <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[12px] p-4">
        <p className="text-sm text-[#92400E] mb-3 leading-relaxed">
          Each section below maps to a specific part of the front-end itinerary
          layout. Use consistent formatting across all days.
        </p>
        <div className="flex flex-wrap gap-2">
          {itineraryGuideTags.map((tag) =>
          <PillTag key={tag} label={tag} />
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/*  3. DAY CARDS                                                      */}
      {/* ================================================================== */}
      {days.map((day, index) =>
      <DayCard
        key={day.dayNumber}
        day={day}
        onChange={(updated) => updateDay(index, updated)} />

      )}

      {/* ================================================================== */}
      {/*  4. ADD DAY BUTTON                                                  */}
      {/* ================================================================== */}
      <Button
        type="button"
        onClick={addDay}
        className="w-fit h-10 px-5 text-sm font-medium text-white bg-[#B48A2C] rounded-[10px] hover:bg-[#B48A2C]/90 transition-colors flex items-center gap-2 shadow-sm">
        
        + Add day
      </Button>

      {/* ================================================================== */}
      {/*  5. STICKY FOOTER                                                   */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          ... Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={() => onNext({ days })}
          disabled={isSaving}
          className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>);

}
