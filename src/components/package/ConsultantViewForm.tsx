"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";

import type { ConsultantViewData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";import { Label } from "@/components/ui/label";import { Textarea } from "@/components/ui/textarea";import { Button } from "@/components/ui/button";

interface ConsultantViewFormProps extends StepFormBaseProps {
  onNext: (data: ConsultantViewData) => void;
  onPrevious: () => void;
  initialData?: ConsultantViewData | null;
}

/* -------------------------------------------------------------------------- */
/*  Field Configurations                                                      */
/* -------------------------------------------------------------------------- */
interface FieldConfig {
  label: string;
  placeholder: string;
  stateKey: string;
}

const FIELD_ROWS: [FieldConfig, FieldConfig][] = [
[
{
  label: "Internal summary",
  placeholder: "Brief internal summary of the package...",
  stateKey: "internalSummary"
},
{
  label: "How to sell this package",
  placeholder: "Key selling points and approach tips...",
  stateKey: "howToSell"
}],

[
{
  label: "Best client profile",
  placeholder: "Describe the ideal client persona for this package...",
  stateKey: "bestClientProfile"
},
{
  label: "Common objections",
  placeholder: "Frequent client objections and how to handle them...",
  stateKey: "commonObjections"
}],

[
{
  label: "Suggested response",
  placeholder: "How consultants should respond to common scenarios...",
  stateKey: "suggestedResponse"
},
{
  label: "Upsell ideas",
  placeholder: "Upgrade paths, add-ons, and cross-sell opportunities...",
  stateKey: "upsellIdeas"
}],

[
{
  label: "Do not promise",
  placeholder: "Things consultants must not guarantee or promise...",
  stateKey: "doNotPromise"
},
{
  label: "Known risks",
  placeholder: "Potential risks, disclaimers, or watch-outs...",
  stateKey: "knownRisks"
}],

[
{
  label: "Visa and passport reminders",
  placeholder:
  "Passport validity, likely visa needs, documents consultants should check early.",
  stateKey: "visaPassportReminders"
},
{
  label: "Halal and dietary positioning",
  placeholder:
  "How confidently we can position halal, vegetarian or other meal support.",
  stateKey: "halalDietaryPositioning"
}],

[
{
  label: "Client suitability notes",
  placeholder:
  "Families, elderly travellers, mobility concerns, honeymooners, groups, first-time travellers.",
  stateKey: "clientSuitabilityNotes"
},
{
  label: "Urgency or follow-up guidance",
  placeholder:
  "When to call, when to follow up, when to re-check supplier rates.",
  stateKey: "urgencyFollowUpGuidance"
}]];



/* -------------------------------------------------------------------------- */
/*  Single Field Card                                                         */
/* -------------------------------------------------------------------------- */
function ConsultantFieldCard({
  label,
  placeholder,
  value,
  onChange





}: {label: string;placeholder: string;value: string;onChange: (value: string) => void;}) {
  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
      <Label className="block text-sm font-bold text-[#1F2A44] mb-3">
        {label}
      </Label>
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[140px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300 resize-y" />
      
    </div>);

}

/* -------------------------------------------------------------------------- */
/*  Main ConsultantViewForm Component                                          */
/* -------------------------------------------------------------------------- */
export default function ConsultantViewForm({
  onNext,
  onPrevious,
  isSaving = false
}: ConsultantViewFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================================== */}
      {/*  SECTION HEADER                                                     */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <h2 className="text-lg font-bold text-[#1F2A44]">Consultant View</h2>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
          Internal sales notes shown to consultants only.
        </p>
      </div>

      {/* ================================================================== */}
      {/*  2-COLUMN GRID WITH ALL 12 FIELDS                                    */}
      {/* ================================================================== */}
      <div className="space-y-6">
        {FIELD_ROWS.map(([leftField, rightField]) =>
        <div
          key={`${leftField.stateKey}-${rightField.stateKey}`}
          className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
            <ConsultantFieldCard
            label={leftField.label}
            placeholder={leftField.placeholder}
            value={formValues[leftField.stateKey] || ""}
            onChange={(value) => handleFieldChange(leftField.stateKey, value)} />
          
            <ConsultantFieldCard
            label={rightField.label}
            placeholder={rightField.placeholder}
            value={formValues[rightField.stateKey] || ""}
            onChange={(value) => handleFieldChange(rightField.stateKey, value)} />
          
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={() => onNext(formValues as ConsultantViewData)}
          disabled={isSaving}
          className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>);

}
