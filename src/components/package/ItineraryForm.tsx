"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/icons";
import type { ItineraryData, ItineraryDay } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Button } from "@/components/ui/button";
import BlogRichTextEditor from "@/components/blogs/BlogRichTextEditor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface ItineraryFormProps extends StepFormBaseProps {
  onNext: (data: ItineraryData) => void;
  onPrevious: () => void;
  initialData?: ItineraryData | null;
  /** Package duration in days from Package Basics (`days` field). */
  packageDurationDays?: string | number | null;
}

function createEmptyDay(dayNumber: number): ItineraryDay {
  return {
    dayNumber,
    title: "",
    description: "",
    activitiesIncluded: "",
    highlights: "",
    internalNotes: "",
    mobilityWarning: "",
    supplierNotes: "",
    dietaryNotes: "",
    breakfast: false,
    lunch: false,
    dinner: false,
  };
}

function parseDurationDays(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(Math.floor(n), 60);
}

function normalizeDay(day: ItineraryDay, dayNumber: number): ItineraryDay {
  return {
    ...createEmptyDay(dayNumber),
    ...day,
    dayNumber,
    description: toEditorHtml(day.description),
    dietaryNotes: day.dietaryNotes ?? day.halalFoodNote ?? "",
  };
}

function buildDaysForDuration(
  duration: number,
  existing?: ItineraryDay[] | null
): ItineraryDay[] {
  if (duration < 1) return [];

  return Array.from({ length: duration }, (_, index) => {
    const dayNumber = index + 1;
    const prior =
      existing?.find((d) => d.dayNumber === dayNumber) ?? existing?.[index];
    return prior ? normalizeDay(prior, dayNumber) : createEmptyDay(dayNumber);
  });
}

function ToggleBlock({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full border border-gray-200 bg-white">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <ToggleSwitch
        checked={enabled}
        onCheckedChange={onChange}
        color="gold"
        aria-label={label}
      />
    </div>
  );
}

function PillTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-[#A8832A] border border-[#A8832A]/40 rounded-full bg-[#FFF9EB]">
      {label}
    </span>
  );
}

function isEmptyRichText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim() === "";
}

function storeRichText(html: string): string {
  return isEmptyRichText(html) ? "" : html;
}

function toEditorHtml(value: string | undefined): string {
  const raw = value ?? "";
  if (!raw.trim()) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function dayHasUserContent(day: ItineraryDay): boolean {
  return Boolean(
    day.title?.trim() ||
      !isEmptyRichText(day.description ?? "") ||
      day.activitiesIncluded?.trim() ||
      day.highlights?.trim() ||
      day.internalNotes?.trim() ||
      day.mobilityWarning?.trim() ||
      day.supplierNotes?.trim() ||
      day.dietaryNotes?.trim() ||
      day.breakfast ||
      day.lunch ||
      day.dinner
  );
}

function savedDaysKey(days: ItineraryDay[] | null | undefined): string {
  return JSON.stringify(days ?? []);
}

interface DayCardProps {
  day: ItineraryDay;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (day: ItineraryDay) => void;
}

function DayCard({ day, isOpen, onToggle, onChange }: DayCardProps) {
  const update = (patch: Partial<ItineraryDay>) => {
    onChange({ ...day, ...patch });
  };

  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";

  const textareaClass =
    "w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[10px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";

  const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";

  return (
    <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full px-6 py-4 border-b border-gray-100 bg-[#FAFAFA] flex items-center justify-between gap-3 text-left hover:bg-[#F3F4F6] transition-colors"
      >
        <h3 className="text-base font-semibold text-[#1F2A44]">
          Day {day.dayNumber}
          {day.title ? (
            <span className="ml-2 font-normal text-gray-500">— {day.title}</span>
          ) : null}
        </h3>
        <Icon
          name={isOpen ? "ChevronDown" : "ChevronRight"}
          size={18}
          className="text-gray-400 shrink-0"
        />
      </button>

      {isOpen ? (
        <div className="p-6 space-y-5">
          <div>
            <Label className={labelClass}>Day title</Label>
            <Input
              type="text"
              placeholder="e.g., Arrival in Singapore"
              className={inputClass}
              value={day.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Description</Label>
            <BlogRichTextEditor
              value={day.description ?? ""}
              onChange={(html) => update({ description: storeRichText(html) })}
              placeholder="Structure this day for clients — morning, afternoon, evening, transfers, and what they will see…"
              defaultHeight={180}
              minHeight={120}
              maxHeight={640}
            />
            <p className="mt-1.5 text-xs italic text-gray-400">
              Use headings, bullets, and emphasis so the day reads clearly for consultants and clients.
            </p>
          </div>

          <div>
            <Label className={labelClass}>Activities included</Label>
            <Textarea
              placeholder="List included activities..."
              rows={4}
              className={textareaClass}
              value={day.activitiesIncluded ?? ""}
              onChange={(e) => update({ activitiesIncluded: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Highlights</Label>
            <Textarea
              placeholder="Key highlights for this day..."
              rows={3}
              className={textareaClass}
              value={day.highlights ?? ""}
              onChange={(e) => update({ highlights: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Internal consultant notes</Label>
            <Textarea
              placeholder="Notes visible only to consultants..."
              rows={4}
              className={textareaClass}
              value={day.internalNotes ?? ""}
              onChange={(e) => update({ internalNotes: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Mobility warnings</Label>
            <Textarea
              placeholder="e.g., Uneven terrain, stairs..."
              rows={3}
              className={textareaClass}
              value={day.mobilityWarning ?? ""}
              onChange={(e) => update({ mobilityWarning: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Supplier notes</Label>
            <Textarea
              placeholder="Supplier-specific information..."
              rows={3}
              className={textareaClass}
              value={day.supplierNotes ?? ""}
              onChange={(e) => update({ supplierNotes: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Dietary notes</Label>
            <Textarea
              placeholder="Dietary requirements or food availability notes..."
              rows={3}
              className={textareaClass}
              value={day.dietaryNotes ?? ""}
              onChange={(e) => update({ dietaryNotes: e.target.value })}
            />
          </div>

          <div>
            <Label className={labelClass}>Meals</Label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ToggleBlock
                label="Breakfast"
                enabled={day.breakfast ?? false}
                onChange={(value) => update({ breakfast: value })}
              />
              <ToggleBlock
                label="Lunch"
                enabled={day.lunch ?? false}
                onChange={(value) => update({ lunch: value })}
              />
              <ToggleBlock
                label="Dinner"
                enabled={day.dinner ?? false}
                onChange={(value) => update({ dinner: value })}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ItineraryForm({
  onNext,
  onPrevious,
  isSaving = false,
  initialData,
  packageDurationDays,
}: ItineraryFormProps) {
  const duration = parseDurationDays(packageDurationDays);
  const incomingDays = initialData?.days;
  const incomingKey = savedDaysKey(incomingDays);
  const lastIncomingKey = useRef(incomingKey);
  const lastDuration = useRef(duration);

  const [days, setDays] = useState<ItineraryDay[]>(() =>
    buildDaysForDuration(duration, incomingDays)
  );
  const [openDayNumber, setOpenDayNumber] = useState<number | null>(() =>
    duration >= 1 ? 1 : null
  );

  useEffect(() => {
    const savedChanged = lastIncomingKey.current !== incomingKey;
    const durationChanged = lastDuration.current !== duration;
    lastIncomingKey.current = incomingKey;
    lastDuration.current = duration;

    if (!savedChanged && !durationChanged) return;

    setDays((prev) => {
      const incomingHasContent = (incomingDays ?? []).some(dayHasUserContent);
      const prevHasContent = prev.some(dayHasUserContent);

      // Empty generated tabs must yield to saved itinerary when it arrives later.
      if (savedChanged && incomingHasContent && !prevHasContent) {
        return buildDaysForDuration(duration, incomingDays);
      }

      if (durationChanged) {
        return buildDaysForDuration(
          duration,
          prev.length || prevHasContent ? prev : incomingDays
        );
      }

      // Keep in-progress edits when parent re-stamps the same package.
      if (prevHasContent) return prev;
      return buildDaysForDuration(duration, incomingDays ?? prev);
    });

    if (!durationChanged) return;

    setOpenDayNumber((prev) => {
      if (duration < 1) return null;
      if (prev != null && prev <= duration) return prev;
      return 1;
    });
  }, [duration, incomingKey, incomingDays]);

  const updateDay = (index: number, day: ItineraryDay) => {
    setDays((prev) => prev.map((d, i) => (i === index ? day : d)));
  };

  const handleToggleDay = (dayNumber: number) => {
    setOpenDayNumber((prev) => (prev === dayNumber ? null : dayNumber));
  };

  const itineraryGuideTags = [
    "Client copy",
    "Activities",
    "Highlights",
    "Meals",
    "Mobility warnings",
    "Dietary notes",
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Itinerary</h2>
          <Button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-gray-400 hover:bg-gray-300 hover:text-gray-500 transition-colors"
            title="Info"
          >
            <span className="text-[11px] font-bold leading-none">i</span>
          </Button>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Days are generated automatically from the package duration. Open one day
          at a time to keep long itineraries manageable. Optional experiences belong
          in Add-ons / Inclusions.
        </p>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[12px] p-4">
        <p className="text-sm text-[#92400E] mb-3 leading-relaxed">
          {duration >= 1 ? (
            <>
              Package duration is <strong>{duration} day{duration === 1 ? "" : "s"}</strong>
              {" — "}
              {duration} itinerary tab{duration === 1 ? "" : "s"} created automatically.
            </>
          ) : (
            <>
              Set <strong>Days</strong> under Package Basics to generate itinerary tabs
              automatically.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {itineraryGuideTags.map((tag) => (
            <PillTag key={tag} label={tag} />
          ))}
        </div>
      </div>

      {days.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-dashed border-[#E5E7EB] px-6 py-10 text-center">
          <p className="text-sm text-gray-500">
            No itinerary days yet. Go back to Package Basics and enter the package
            duration (Days).
          </p>
        </div>
      ) : (
        days.map((day, index) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            isOpen={openDayNumber === day.dayNumber}
            onToggle={() => handleToggleDay(day.dayNumber)}
            onChange={(updated) => updateDay(index, updated)}
          />
        ))
      )}

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
          onClick={() => onNext({ days })}
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
