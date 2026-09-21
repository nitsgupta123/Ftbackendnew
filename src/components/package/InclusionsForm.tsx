import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Icon } from "../ui/icons";

import type { InclusionsData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface InclusionsFormProps extends StepFormBaseProps {
  onNext: (data: InclusionsData) => void;
  onPrevious: () => void;
  initialData?: InclusionsData | null;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return fallback;
}

function inclusionsSyncKey(data: InclusionsData | null | undefined): string | null {
  if (!data) return null;
  return JSON.stringify({
    included: asStringArray(data.included),
    excluded: asStringArray(data.excluded),
    optionalAddons: asStringArray(data.optionalAddons),
    localFees: data.localFees ?? "",
    nonRefundable: data.nonRefundable ?? "",
    consultantMustExplain: data.consultantMustExplain ?? true,
    flightsIncluded: data.flightsIncluded ?? false,
    trainIncluded: data.trainIncluded ?? false,
    transfersIncluded: data.transfersIncluded ?? true,
  });
}

/* -------------------------------------------------------------------------- */
/*  Tag Item Chip — inline edit + delete                                      */
/* -------------------------------------------------------------------------- */
const tagIconBtnClass =
  "inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-gray-400 hover:text-[#1F2A44] hover:bg-gray-100 transition-colors";

function TagItem({
  label,
  onEdit,
  onRemove,
}: {
  label: string;
  onEdit: (next: string) => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(label);
  }, [label, isEditing]);

  const commit = () => {
    const trimmed = (inputRef.current?.value ?? draft).trim();
    if (!trimmed) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    if (trimmed !== label) onEdit(trimmed);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(label);
    setError(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            aria-invalid={error || undefined}
            autoFocus
            className="flex-1 h-[38px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C]"
          />
          <button
            type="button"
            onClick={commit}
            className={`${tagIconBtnClass} text-[#16A34A] hover:text-[#15803D] hover:bg-green-50`}
            aria-label="Save"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={cancel}
            className={tagIconBtnClass}
            aria-label="Cancel"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600">Enter a value before saving.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 bg-white border border-[#E5E7EB] rounded-[8px] px-3 py-[8px] transition-all duration-200 hover:border-gray-300">
      <span className="text-sm text-[#1F2A44] font-medium truncate pr-1">
        {label}
      </span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={tagIconBtnClass}
          aria-label={`Edit ${label}`}
          title="Edit"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={`${tagIconBtnClass} hover:text-red-500 hover:bg-red-50`}
          aria-label={`Delete ${label}`}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Column 1: Included — always-visible input + "+ Add" button                */
/* -------------------------------------------------------------------------- */
function IncludedColumn({
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  items: string[];
  onAdd: (value: string) => void;
  onEdit: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = (inputRef.current?.value ?? inputValue).trim();
    if (!trimmed) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    onAdd(trimmed);
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 flex flex-col h-full">
      <h3 className="text-sm font-bold text-[#1F2A44] mb-4">Included</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter included item"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(false);
            }}
            aria-invalid={error || undefined}
            className="w-full h-[44px] px-4 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300"
          />
          {error && (
            <p className="mt-1.5 text-xs text-red-600">Enter an item before adding.</p>
          )}
        </div>

        <button
          type="submit"
          className="w-fit h-[42px] px-4 text-sm font-medium text-white bg-[#1F2A44] border border-[#B48A2C] rounded-md hover:bg-[#283556] active:bg-[#1A2338] transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus size={15} aria-hidden />
          Add
        </button>
      </form>

      {items.length > 0 && (
        <div className="space-y-2.5 mt-4">
          {items.map((item, idx) => (
            <TagItem
              key={`${item}-${idx}`}
              label={item}
              onEdit={(value) => onEdit(idx, value)}
              onRemove={() => onRemove(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Column 2 / 3: Always-visible input + "+ Add" on top (like Included)       */
/* -------------------------------------------------------------------------- */
function TagColumnCard({
  title,
  items,
  onAdd,
  onEdit,
  onRemove,
  placeholder,
}: {
  title: string;
  items: string[];
  onAdd: (value: string) => void;
  onEdit: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = (inputRef.current?.value ?? inputValue).trim();
    if (!trimmed) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setError(false);
    onAdd(trimmed);
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 flex flex-col h-full">
      <h3 className="text-sm font-bold text-[#1F2A44] mb-4">{title}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(false);
            }}
            aria-invalid={error || undefined}
            className="w-full h-[44px] px-4 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300"
          />
          {error && (
            <p className="mt-1.5 text-xs text-red-600">Enter an item before adding.</p>
          )}
        </div>

        <button
          type="submit"
          className="w-fit h-[42px] px-4 text-sm font-medium text-white bg-[#1F2A44] border border-[#B48A2C] rounded-md hover:bg-[#283556] active:bg-[#1A2338] transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus size={15} aria-hidden />
          Add
        </button>
      </form>

      {items.length > 0 && (
        <div className="space-y-2.5 mt-4">
          {items.map((item, idx) => (
            <TagItem
              key={`${item}-${idx}`}
              label={item}
              onEdit={(value) => onEdit(idx, value)}
              onRemove={() => onRemove(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feature Inclusion Toggle                                                  */
/* -------------------------------------------------------------------------- */
function FeatureToggleCard({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#E5E7EB] bg-white px-4 py-3.5">
      <span className="text-sm font-semibold text-[#334155]">{label}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-medium ${enabled ? "text-[#27AE60]" : "text-gray-400"}`}>
          {enabled ? "Yes" : "No"}
        </span>
        <ToggleSwitch checked={enabled} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer Toggle Card                                                        */
/* -------------------------------------------------------------------------- */
function ConsultantToggleCard({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (value: boolean) => void;
}) {
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
      className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-4 cursor-pointer select-none transition-all duration-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20"
    >
      <span className="text-sm font-bold text-[#1F2A44] leading-snug max-w-[75%]">
        Consultant must explain these before booking
      </span>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={`text-sm font-semibold transition-colors duration-200 ${
            active ? "text-[#16A34A]" : "text-[#64748B]"
          }`}
        >
          {active ? "Yes" : "No"}
        </span>
        <ToggleSwitch
          checked={active}
          onCheckedChange={onChange}
          size="lg"
          color="emerald"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main InclusionsForm Component                                             */
/* -------------------------------------------------------------------------- */
export default function InclusionsForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: InclusionsFormProps) {
  const [included, setIncluded] = useState<string[]>(() => asStringArray(initialData?.included));
  const [excluded, setExcluded] = useState<string[]>(() =>
    asStringArray(initialData?.excluded, [
      "International",
      "Visa fees",
      "Travel insura",
      "City tax or to",
    ])
  );
  const [optionalAddons, setOptionalAddons] = useState<string[]>(() =>
    asStringArray(initialData?.optionalAddons, ["Travel insura", "Visa support", "Private guide"])
  );

  const [localFees, setLocalFees] = useState(initialData?.localFees ?? "");
  const [nonRefundable, setNonRefundable] = useState(initialData?.nonRefundable ?? "");
  const [consultantMustExplain, setConsultantMustExplain] = useState(
    initialData?.consultantMustExplain ?? true
  );
  const [flightsIncluded, setFlightsIncluded] = useState(
    initialData?.flightsIncluded ?? false
  );
  const [trainIncluded, setTrainIncluded] = useState(initialData?.trainIncluded ?? false);
  const [transfersIncluded, setTransfersIncluded] = useState(
    initialData?.transfersIncluded ?? true
  );

  const syncKey = inclusionsSyncKey(initialData);
  const lastSyncedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!syncKey || !initialData) return;
    // Only re-hydrate when saved/server inclusions actually change (not on new object refs).
    if (lastSyncedKey.current === syncKey) return;
    lastSyncedKey.current = syncKey;

    setIncluded(asStringArray(initialData.included));
    setExcluded(asStringArray(initialData.excluded));
    setOptionalAddons(asStringArray(initialData.optionalAddons));
    setLocalFees(initialData.localFees ?? "");
    setNonRefundable(initialData.nonRefundable ?? "");
    setConsultantMustExplain(initialData.consultantMustExplain ?? true);
    setFlightsIncluded(initialData.flightsIncluded ?? false);
    setTrainIncluded(initialData.trainIncluded ?? false);
    setTransfersIncluded(initialData.transfersIncluded ?? true);
  }, [syncKey, initialData]);

  const textareaClass =
    "w-full min-h-[140px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-all duration-200 hover:border-gray-300 resize-y";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <h2 className="text-lg font-bold text-[#1F2A44]">
          Inclusions, Exclusions & Add-ons
        </h2>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
          Anything not included should be clearly excluded or listed as an
          optional add-on.
        </p>
      </div>

      {/* Transport inclusion toggles */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-4">Transport inclusions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureToggleCard
            label="Flights Included"
            enabled={flightsIncluded}
            onChange={setFlightsIncluded}
          />
          <FeatureToggleCard
            label="Train Included"
            enabled={trainIncluded}
            onChange={setTrainIncluded}
          />
          <FeatureToggleCard
            label="Transfers Included"
            enabled={transfersIncluded}
            onChange={setTransfersIncluded}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <IncludedColumn
          items={included}
          onAdd={(value) => setIncluded((prev) => [...prev, value])}
          onEdit={(index, value) =>
            setIncluded((prev) => prev.map((item, i) => (i === index ? value : item)))
          }
          onRemove={(index) =>
            setIncluded((prev) => prev.filter((_, i) => i !== index))
          }
        />

        <TagColumnCard
          title="Excluded"
          items={excluded}
          placeholder="Add exclusion"
          onAdd={(value) => setExcluded((prev) => [...prev, value])}
          onEdit={(index, value) =>
            setExcluded((prev) => prev.map((item, i) => (i === index ? value : item)))
          }
          onRemove={(index) =>
            setExcluded((prev) => prev.filter((_, i) => i !== index))
          }
        />

        <TagColumnCard
          title="Optional add-ons"
          items={optionalAddons}
          placeholder="Add optional"
          onAdd={(value) => setOptionalAddons((prev) => [...prev, value])}
          onEdit={(index, value) =>
            setOptionalAddons((prev) => prev.map((item, i) => (i === index ? value : item)))
          }
          onRemove={(index) =>
            setOptionalAddons((prev) => prev.filter((_, i) => i !== index))
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5">
          <Label className="block text-sm font-bold text-[#1F2A44] mb-3">
            Local fees and taxes
          </Label>
          <Textarea
            placeholder="Describe any local fees, tourist taxes, or surcharges payable on-site..."
            value={localFees}
            onChange={(e) => setLocalFees(e.target.value)}
            className={textareaClass}
          />
        </div>

        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5">
          <Label className="block text-sm font-bold text-[#1F2A44] mb-3">
            Non-refundable components
          </Label>
          <Textarea
            placeholder="List any non-refundable deposits, fees, or components..."
            value={nonRefundable}
            onChange={(e) => setNonRefundable(e.target.value)}
            className={textareaClass}
          />
        </div>
      </div>

      <ConsultantToggleCard
        active={consultantMustExplain}
        onChange={setConsultantMustExplain}
      />

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}
        >
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
              consultantMustExplain,
              flightsIncluded,
              trainIncluded,
              transfersIncluded,
            })
          }
          disabled={isSaving}
          data-package-step-save="" className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>
  );
}
