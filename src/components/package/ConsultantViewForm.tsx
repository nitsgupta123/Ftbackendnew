"use client";

import { useEffect, useState } from "react";
import { Icon } from "../ui/icons";
import { ConsultantCrmPanels } from "@/components/packages/PackageConsultantBrief";
import { mergeObjectionText } from "@/lib/package-content";
import type { ConsultantViewData, PackageRecord } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ConsultantViewFormProps extends StepFormBaseProps {
  onNext: (data: ConsultantViewData) => void;
  onPrevious: () => void;
  initialData?: ConsultantViewData | null;
  packageRecord?: PackageRecord | null;
}

interface FieldConfig {
  label: string;
  placeholder: string;
  hint?: string;
  stateKey: keyof ConsultantViewData;
  wide?: boolean;
}

const FIELDS: FieldConfig[] = [
  {
    label: "Internal summary",
    placeholder: "Brief internal summary of the package...",
    stateKey: "internalSummary",
  },
  {
    label: "How to sell this package",
    placeholder: "Key selling points and approach tips...",
    stateKey: "howToSell",
  },
  {
    label: "Best client profile",
    placeholder: "Describe the ideal client persona for this package...",
    stateKey: "bestClientProfile",
  },
  {
    label: "Common objections and suggested responses",
    placeholder: "Write the objection and the response you want consultants to use...",
    hint: "Objections and the suggested responses go in this one box.",
    stateKey: "commonObjections",
    wide: true,
  },
  {
    label: "Upsell ideas",
    placeholder: "Upgrade paths, add-ons, and cross-sell opportunities...",
    stateKey: "upsellIdeas",
  },
  {
    label: "Do not promise",
    placeholder: "Things consultants must not guarantee or promise...",
    stateKey: "doNotPromise",
  },
  {
    label: "Known risks",
    placeholder: "Potential risks, disclaimers, or watch-outs...",
    stateKey: "knownRisks",
  },
  {
    label: "Visa and passport reminders",
    placeholder: "Passport validity, likely visa needs, documents consultants should check early.",
    stateKey: "visaPassportReminders",
  },
  {
    label: "Halal and dietary positioning",
    placeholder: "How confidently we can position halal, vegetarian or other meal support.",
    stateKey: "halalDietaryPositioning",
  },
  {
    label: "Client suitability notes",
    placeholder: "Families, elderly travellers, mobility concerns, honeymooners, groups, first-time travellers.",
    stateKey: "clientSuitabilityNotes",
  },
  {
    label: "Urgency or follow-up guidance",
    placeholder: "When to call, when to follow up, when to re-check supplier rates.",
    stateKey: "urgencyFollowUpGuidance",
  },
];

function readValues(data?: ConsultantViewData | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of FIELDS) {
    values[field.stateKey] = data?.[field.stateKey] ?? "";
  }
  values.commonObjections = mergeObjectionText(data);
  return values;
}

function ConsultantFieldCard({
  label,
  placeholder,
  hint,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
      <Label className="block text-sm font-bold text-[#1F2A44] mb-1">{label}</Label>
      {hint && <p className="mb-3 text-xs text-gray-500">{hint}</p>}
      {!hint && <div className="mb-3" />}
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[140px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300 resize-y"
      />
    </div>
  );
}

export default function ConsultantViewForm({
  onNext,
  onPrevious,
  isSaving = false,
  initialData,
  packageRecord,
}: ConsultantViewFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => readValues(initialData));

  useEffect(() => {
    setFormValues(readValues(initialData));
  }, [initialData]);

  const paired = FIELDS.filter((field) => !field.wide);
  const wide = FIELDS.filter((field) => field.wide);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <h2 className="text-lg font-bold text-[#1F2A44]">Consultant View</h2>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
          Internal sales notes shown to consultants only. Consultants have read-only
          access to supplier documents and package details.
        </p>
      </div>

      <div className="rounded-[12px] border border-[#FCD34D] bg-[#FFFBEB] px-5 py-4 text-sm text-[#92400E] leading-relaxed">
        Consultants can view the supplier brochure, Internal Supplier Notes, package
        pricing, itinerary, hotels, inclusions, exclusions, Important Notes, and booking
        policies. They cannot edit those records.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paired.map((field) => (
          <ConsultantFieldCard
            key={field.stateKey}
            label={field.label}
            placeholder={field.placeholder}
            hint={field.hint}
            value={formValues[field.stateKey] || ""}
            onChange={(value) => setFormValues((prev) => ({ ...prev, [field.stateKey]: value }))}
          />
        ))}
      </div>

      {wide.map((field) => (
        <ConsultantFieldCard
          key={field.stateKey}
          label={field.label}
          placeholder={field.placeholder}
          hint={field.hint}
          value={formValues[field.stateKey] || ""}
          onChange={(value) => setFormValues((prev) => ({ ...prev, [field.stateKey]: value }))}
        />
      ))}

      <ConsultantCrmPanels pkg={packageRecord ?? null} />

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>
        <p className="text-xs text-gray-400 flex-1 text-center">Incomplete sections stay as draft.</p>
        <Button
          type="button"
          onClick={() =>
            onNext({
              ...(formValues as ConsultantViewData),
              suggestedResponse: undefined,
            })
          }
          disabled={isSaving}
          data-package-step-save=""
          className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>
  );
}
