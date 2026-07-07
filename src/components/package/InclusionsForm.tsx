"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Icon } from "../ui/icons";

import type { InclusionsData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";import { Button } from "@/components/ui/button";import { Input } from "@/components/ui/input";import { Label } from "@/components/ui/label";import { Textarea } from "@/components/ui/textarea";

interface InclusionsFormProps extends StepFormBaseProps {
  onNext: (data: InclusionsData) => void;
  onPrevious: () => void;
  initialData?: InclusionsData | null;
}

/* -------------------------------------------------------------------------- */
/*  Tag Item Chip (used in Excluded & Optional add-ons columns)               */
/* -------------------------------------------------------------------------- */
function TagItem({
  label,
  onRemove



}: {label: string;onRemove: () => void;}) {
  return (
    <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[8px] px-4 py-[10px] transition-all duration-200 hover:border-gray-300 group">
      <span className="text-sm text-[#1F2A44] font-medium truncate pr-2">
        {label}
      </span>
      <Button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 w-[22px] h-[22px] flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Remove ${label}`}>
        
        <X size={12} />
      </Button>
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Column 1: Included — always-visible input + "+ Add" button                */
/* -------------------------------------------------------------------------- */
function IncludedColumn({
  items,
  onAdd,
  onRemove




}: {items: string[];onAdd: (value: string) => void;onRemove: (index: number) => void;}) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 flex flex-col h-full">
      {/* Title */}
      <h3 className="text-sm font-bold text-[#1F2A44] mb-4">Included</h3>

      {/* Tag items (if any were added) */}
      {items.length > 0 &&
      <div className="space-y-2.5 mb-4">
          {items.map((item, idx) =>
        <TagItem
          key={`${item}-${idx}`}
          label={item}
          onRemove={() => onRemove(idx)} />

        )}
        </div>
      }

      {/* Empty text input */}
      <Input
        type="text"
        placeholder="Enter included item"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-[44px] px-4 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300" />
      

      {/* "+ Add" button */}
      <Button
        type="button"
        onClick={handleAdd}
        className="w-fit h-[42px] px-4 mt-4 text-sm font-medium text-white bg-[#1F2A44] rounded-md hover:bg-[#283556] active:bg-[#1A2338] transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
        
        <Plus size={15} />
        Add
      </Button>
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Column 2 / 3: Tag stack + bottom "+ Add" button (reveals inline input)    */
/* -------------------------------------------------------------------------- */
function TagColumnCard({
  title,
  items,
  onAdd,
  onRemove,
  placeholder






}: {title: string;items: string[];onAdd: (value: string) => void;onRemove: (index: number) => void;placeholder: string;}) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleConfirmAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onAdd(trimmed);
    }
    setInputValue("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmAdd();
    } else if (e.key === "Escape") {
      setInputValue("");
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 flex flex-col h-full">
      {/* Title */}
      <h3 className="text-sm font-bold text-[#1F2A44] mb-4">{title}</h3>

      {/* Tag stack */}
      <div className="flex-1 space-y-2.5">
        {items.map((item, idx) =>
        <TagItem
          key={`${item}-${idx}`}
          label={item}
          onRemove={() => onRemove(idx)} />

        )}

        {/* Inline quick-add input — revealed when "+ Add" is clicked */}
        {isAdding &&
        <div className="flex items-center gap-2">
            <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300" />
          
            <Button
            type="button"
            onClick={handleConfirmAdd}
            className="h-[40px] px-3 text-sm font-medium text-white bg-[#1F2A44] rounded-[8px] hover:bg-[#283556] active:bg-[#1A2338] transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 shadow-sm">
            
              <Plus size={13} />
              Add
            </Button>
          </div>
        }
      </div>

      {/* "+ Add" button at the bottom */}
      {!isAdding &&
      <Button
        type="button"
        onClick={() => setIsAdding(true)}
        className="w-fit h-[42px] px-4 mt-5 text-sm font-medium text-white bg-[#1F2A44] rounded-md hover:bg-[#283556] active:bg-[#1A2338] transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
        
          <Plus size={15} />
          Add
        </Button>
      }

      {/* Cancel adding when input is visible */}
      {isAdding &&
      <Button
        type="button"
        onClick={() => {
          setInputValue("");
          setIsAdding(false);
        }}
        className="w-full h-[36px] mt-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors duration-150">
        
          Cancel
        </Button>
      }
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Footer Toggle Card                                                        */
/* -------------------------------------------------------------------------- */
function ConsultantToggleCard({
  active,
  onChange



}: {active: boolean;onChange: (value: boolean) => void;}) {
  return (
    <div
      onClick={() => onChange(!active)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!active);
        }
      }}
      className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-4 cursor-pointer select-none transition-all duration-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20">
      
      {/* Left: Label */}
      <span className="text-sm font-bold text-[#1F2A44] leading-snug max-w-[75%]">
        Consultant must explain these before booking
      </span>

      {/* Right: Toggle pill + status label */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={`text-sm font-semibold transition-colors duration-200 ${
          active ? "text-[#16A34A]" : "text-[#64748B]"}`
          }>
          
          {active ? "Yes" : "No"}
        </span>
        <div
          role="switch"
          aria-checked={active}
          className={`
            relative inline-flex h-[26px] w-[46px] items-center rounded-full flex-shrink-0
            transition-colors duration-300 ease-in-out
            ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}
          `}>
          
          <span
            className={`
              inline-block h-[20px] w-[20px] transform rounded-full bg-white
              shadow-sm ring-0 transition-transform duration-300 ease-in-out
              ${active ? "translate-x-[23px]" : "translate-x-[3px]"}
            `} />
          
        </div>
      </div>
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Main InclusionsForm Component                                             */
/* -------------------------------------------------------------------------- */
export default function InclusionsForm({ onNext, onPrevious, isSaving = false }: InclusionsFormProps) {
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([
  "International",
  "Visa fees",
  "Travel insura",
  "City tax or to"]
  );
  const [optionalAddons, setOptionalAddons] = useState<string[]>([
  "Travel insura",
  "Visa support",
  "Private guide"]
  );

  const [localFees, setLocalFees] = useState("");
  const [nonRefundable, setNonRefundable] = useState("");
  const [consultantMustExplain, setConsultantMustExplain] = useState(true);

  const textareaClass =
  "w-full min-h-[140px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300 resize-y";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================================== */}
      {/*  SECTION HEADER                                                     */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <h2 className="text-lg font-bold text-[#1F2A44]">
          Inclusions, Exclusions & Add-ons
        </h2>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
          Anything not included should be clearly excluded or listed as an
          optional add-on.
        </p>
      </div>

      {/* ================================================================== */}
      {/*  3-COLUMN GRID                                                      */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Column 1: Included */}
        <IncludedColumn
          items={included}
          onAdd={(value) => setIncluded((prev) => [...prev, value])}
          onRemove={(index) =>
          setIncluded((prev) => prev.filter((_, i) => i !== index))
          } />
        

        {/* Column 2: Excluded */}
        <TagColumnCard
          title="Excluded"
          items={excluded}
          placeholder="Add exclusion"
          onAdd={(value) => setExcluded((prev) => [...prev, value])}
          onRemove={(index) =>
          setExcluded((prev) => prev.filter((_, i) => i !== index))
          } />
        

        {/* Column 3: Optional add-ons */}
        <TagColumnCard
          title="Optional add-ons"
          items={optionalAddons}
          placeholder="Add optional"
          onAdd={(value) => setOptionalAddons((prev) => [...prev, value])}
          onRemove={(index) =>
          setOptionalAddons((prev) => prev.filter((_, i) => i !== index))
          } />
        
      </div>

      {/* ================================================================== */}
      {/*  2-COLUMN TEXTAREA GRID                                             */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Local fees and taxes */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5">
          <Label className="block text-sm font-bold text-[#1F2A44] mb-3">
            Local fees and taxes
          </Label>
          <Textarea
            placeholder="Describe any local fees, tourist taxes, or surcharges payable on-site..."
            value={localFees}
            onChange={(e) => setLocalFees(e.target.value)}
            className={textareaClass} />
          
        </div>

        {/* Right: Non-refundable components */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5">
          <Label className="block text-sm font-bold text-[#1F2A44] mb-3">
            Non-refundable components
          </Label>
          <Textarea
            placeholder="List any non-refundable deposits, fees, or components..."
            value={nonRefundable}
            onChange={(e) => setNonRefundable(e.target.value)}
            className={textareaClass} />
          
        </div>
      </div>

      {/* ================================================================== */}
      {/*  FOOTER TOGGLE CARD                                                 */}
      {/* ================================================================== */}
      <ConsultantToggleCard
        active={consultantMustExplain}
        onChange={setConsultantMustExplain} />
      

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
          onClick={() =>
          onNext({
            included,
            excluded,
            optionalAddons,
            localFees,
            nonRefundable,
            consultantMustExplain
          })
          }
          disabled={isSaving}
          className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>);

}
