import { useRef, useState } from "react";
import { Icon } from "../ui/icons";
import type {
  BookingRange,
  ChildPriceType,
  DepartureDateEntry,
  DepartureMonth,
  DepartureStatus,
  DiscountType,
  HotelCategoryKey,
  HotelCategoryPricing,
  PackagePricingType,
  PricingAdultTier,
  PricingBlackout,
  PricingChildRow,
  PricingData,
  PricingDetailsBlock,
  PricingPromotion,
} from "@/lib/package-types";
import {
  saveButtonLabel,
  stepPreviousButtonClass,
  stepSaveButtonClass,
  type StepFormBaseProps,
} from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface PricingFormProps extends StepFormBaseProps {
  onNext: (data: PricingData) => void;
  onPrevious: () => void;
  initialData?: PricingData | null;
}

const HOTEL_CATEGORIES: { key: HotelCategoryKey; label: string }[] = [
  { key: "3star", label: "3 Star" },
  { key: "4star", label: "4 Star" },
  { key: "5star", label: "5 Star" },
];

const DEPARTURE_STATUSES: { value: DepartureStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "guaranteed", label: "Guaranteed Departure" },
  { value: "limited", label: "Limited Availability" },
  { value: "sold_out", label: "Sold Out" },
  { value: "cancelled", label: "Cancelled" },
];

const CHILD_TYPE_LABELS: Record<ChildPriceType, string> = {
  child_with_bed: "Child With Bed",
  child_without_bed: "Child Without Bed",
  infant: "Infant",
};

const addButtonClass =
  "mt-3 w-fit h-10 px-5 text-sm font-medium rounded-[10px] transition-colors flex items-center gap-2";
const addButtonDarkClass = `${addButtonClass} text-white bg-[#1F2A44] hover:bg-[#1F2A44]/90`;
const addButtonGoldClass = `${addButtonClass} text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90`;
const addButtonOutlineClass = `${addButtonClass} text-[#1F2A44] bg-white border border-[#E5E7EB] hover:bg-gray-50`;
const iconBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-gray-500 hover:text-[#1F2A44] hover:border-gray-300 transition-colors";
const tableInputClass =
  "w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
const inputClass =
  "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
const sectionCardClass =
  "bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6";
const nestedCardClass =
  "bg-[#F8F9FB] rounded-[12px] border border-[#E5E7EB] p-4";
const dateInputClass = `${tableInputClass} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`;

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openDatePicker(input: HTMLInputElement | null | undefined) {
  if (!input) return;
  input.focus();
  try {
    input.showPicker?.();
  } catch {
    // Some browsers only allow showPicker during a direct user gesture.
  }
}

function DateInput({
  value,
  onChange,
  onFocus,
  disabled,
  inputRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="date"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={className ?? dateInputClass}
      />
      <Icon
        name="Calendar"
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
}

function createAdultTiers(): PricingAdultTier[] {
  return [1, 2, 3, 4].map((n) => ({
    id: uid(`pax-${n}`),
    pax: `${n} Pax`,
    netPrice: "",
    margin: "",
    retailPrice: "",
  }));
}

function createPricingDetails(): PricingDetailsBlock {
  return {
    adultTiers: createAdultTiers(),
    childRows: [],
    promotions: [],
  };
}

function createBookingRange(name = ""): BookingRange {
  return {
    id: uid("range"),
    name,
    fromDate: "",
    toDate: "",
    blackouts: [],
    pricing: createPricingDetails(),
  };
}

function createDepartureDate(): DepartureDateEntry {
  return {
    id: uid("dep"),
    date: "",
    status: "active",
    pricing: createPricingDetails(),
  };
}

function createDepartureMonth(month = ""): DepartureMonth {
  return {
    id: uid("month"),
    month,
    dates: [createDepartureDate()],
  };
}

function createHotelCategory(category: HotelCategoryKey): HotelCategoryPricing {
  return {
    category,
    bookingRanges: [
      createBookingRange("Low Season"),
      createBookingRange("High Season"),
      createBookingRange("Peak Season"),
    ],
    departureMonths: [createDepartureMonth()],
  };
}

function createDefaultHotelCategories(): HotelCategoryPricing[] {
  return HOTEL_CATEGORIES.map(({ key }) => createHotelCategory(key));
}

function clonePricing(pricing: PricingDetailsBlock): PricingDetailsBlock {
  return {
    adultTiers: pricing.adultTiers.map((row) => ({ ...row, id: uid("pax") })),
    childRows: pricing.childRows.map((row) => ({ ...row, id: uid("child") })),
    promotions: pricing.promotions.map((row) => ({ ...row, id: uid("promo") })),
  };
}

function formatMonthLabel(value: string) {
  if (!value) return "Untitled month";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDisplayDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function hydrateCategories(initial?: PricingData | null): HotelCategoryPricing[] {
  if (initial?.hotelCategories?.length) {
    const byKey = new Map(
      initial.hotelCategories.map((item) => [item.category, item]),
    );
    return HOTEL_CATEGORIES.map(({ key }) => {
      const existing = byKey.get(key);
      if (!existing) return createHotelCategory(key);
      return {
        category: key,
        bookingRanges: existing.bookingRanges?.length
          ? existing.bookingRanges
          : createHotelCategory(key).bookingRanges,
        departureMonths: existing.departureMonths?.length
          ? existing.departureMonths
          : createHotelCategory(key).departureMonths,
      };
    });
  }
  return createDefaultHotelCategories();
}

/* -------------------------------------------------------------------------- */
/*  Shared pricing tables                                                     */
/* -------------------------------------------------------------------------- */

function AdultPricingTable({
  rows,
  onChange,
}: {
  rows: PricingAdultTier[];
  onChange: (rows: PricingAdultTier[]) => void;
}) {
  const update = (id: string, field: keyof PricingAdultTier, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const add = () => {
    onChange([
      ...rows,
      {
        id: uid("pax"),
        pax: `${rows.length + 1} Pax`,
        netPrice: "",
        margin: "",
        retailPrice: "",
      },
    ]);
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-[720px] px-2 sm:px-0">
          <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_88px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Pax</span>
            <span>Net Price</span>
            <span>Margin</span>
            <span>Retail Price</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.1fr_1fr_1fr_1fr_88px] gap-3 py-2.5 items-center"
              >
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.pax}
                  onChange={(e) => update(row.id, "pax", e.target.value)}
                  placeholder="e.g. 2 Pax"
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.netPrice}
                  onChange={(e) => update(row.id, "netPrice", e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.margin}
                  onChange={(e) => update(row.id, "margin", e.target.value)}
                  placeholder="0%"
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.retailPrice}
                  onChange={(e) => update(row.id, "retailPrice", e.target.value)}
                  placeholder="0.00"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Edit row"
                    onClick={() => undefined}
                  >
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Delete row"
                    onClick={() => remove(row.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button type="button" onClick={add} className={addButtonDarkClass}>
        <Icon name="Plus" size={14} />
        Add Pax Tier
      </Button>
    </div>
  );
}

function ChildPricingSection({
  rows,
  onChange,
}: {
  rows: PricingChildRow[];
  onChange: (rows: PricingChildRow[]) => void;
}) {
  const enabledTypes = new Set(rows.map((row) => row.type));

  const addType = (type: ChildPriceType) => {
    if (enabledTypes.has(type)) return;
    onChange([
      ...rows,
      {
        id: uid("child"),
        type,
        netPrice: "",
        margin: "",
        retailPrice: "",
      },
    ]);
  };

  const update = (id: string, field: keyof PricingChildRow, value: string) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div>
      <p className="text-sm text-gray-400 mb-3">
        Child pricing is hidden by default. Add a price type only when it applies.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            "child_with_bed",
            "child_without_bed",
            "infant",
          ] as ChildPriceType[]
        ).map((type) => (
          <Button
            key={type}
            type="button"
            disabled={enabledTypes.has(type)}
            onClick={() => addType(type)}
            className={
              enabledTypes.has(type)
                ? `${addButtonOutlineClass} mt-0 opacity-50 cursor-not-allowed`
                : `${addButtonOutlineClass} mt-0`
            }
          >
            <Icon name="Plus" size={14} />
            Add {CHILD_TYPE_LABELS[type]} Price
          </Button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <div className="min-w-[720px] px-2 sm:px-0">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_88px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
              <span>Type</span>
              <span>Net Price</span>
              <span>Margin</span>
              <span>Retail Price</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-gray-50">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.3fr_1fr_1fr_1fr_88px] gap-3 py-2.5 items-center"
                >
                  <span className="text-sm font-medium text-[#1F2A44]">
                    {CHILD_TYPE_LABELS[row.type]}
                  </span>
                  <Input
                    type="text"
                    className={tableInputClass}
                    value={row.netPrice}
                    onChange={(e) => update(row.id, "netPrice", e.target.value)}
                    placeholder="0.00"
                  />
                  <Input
                    type="text"
                    className={tableInputClass}
                    value={row.margin}
                    onChange={(e) => update(row.id, "margin", e.target.value)}
                    placeholder="0%"
                  />
                  <Input
                    type="text"
                    className={tableInputClass}
                    value={row.retailPrice}
                    onChange={(e) => update(row.id, "retailPrice", e.target.value)}
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Remove"
                    onClick={() => remove(row.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromotionsSection({
  rows,
  onChange,
}: {
  rows: PricingPromotion[];
  onChange: (rows: PricingPromotion[]) => void;
}) {
  const add = () => {
    onChange([
      ...rows,
      {
        id: uid("promo"),
        title: "",
        validFrom: "",
        validTo: "",
        discountType: "percentage",
        value: "",
        active: true,
      },
    ]);
  };

  const update = <K extends keyof PricingPromotion>(
    id: string,
    field: K,
    value: PricingPromotion[K],
  ) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-[900px] px-2 sm:px-0">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1.1fr_0.9fr_90px_100px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Promotion Title</span>
            <span>Valid From</span>
            <span>Valid To</span>
            <span>Discount Type</span>
            <span>Value</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <p className="text-sm text-gray-400 py-4">
                No promotions yet. Add a promotional price when needed.
              </p>
            )}
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.4fr_1fr_1fr_1.1fr_0.9fr_90px_100px] gap-3 py-2.5 items-center"
              >
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.title}
                  onChange={(e) => update(row.id, "title", e.target.value)}
                  placeholder="Promotion title"
                />
                <DateInput
                  value={row.validFrom}
                  onChange={(value) => update(row.id, "validFrom", value)}
                />
                <DateInput
                  value={row.validTo}
                  onChange={(value) => update(row.id, "validTo", value)}
                />
                <NativeSelect
                  className={tableInputClass}
                  value={row.discountType}
                  onChange={(e) =>
                    update(row.id, "discountType", e.target.value as DiscountType)
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </NativeSelect>
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.value}
                  onChange={(e) => update(row.id, "value", e.target.value)}
                  placeholder={row.discountType === "percentage" ? "10%" : "100"}
                />
                <span
                  className={`inline-flex justify-center items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    row.active
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {row.active ? "Active" : "Inactive"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={iconBtnClass}
                    title={row.active ? "Deactivate" : "Activate"}
                    onClick={() => update(row.id, "active", !row.active)}
                  >
                    <Icon name="Power" size={14} />
                  </button>
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Delete"
                    onClick={() => remove(row.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button type="button" onClick={add} className={addButtonGoldClass}>
        <Icon name="Plus" size={14} />
        Add Promotion
      </Button>
    </div>
  );
}

function PricingDetailsEditor({
  pricing,
  onChange,
}: {
  pricing: PricingDetailsBlock;
  onChange: (pricing: PricingDetailsBlock) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">Adult Pricing</h4>
        <div className={nestedCardClass}>
          <AdultPricingTable
            rows={pricing.adultTiers}
            onChange={(adultTiers) => onChange({ ...pricing, adultTiers })}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">Child Pricing</h4>
        <div className={nestedCardClass}>
          <ChildPricingSection
            rows={pricing.childRows}
            onChange={(childRows) => onChange({ ...pricing, childRows })}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">Promotions</h4>
        <div className={nestedCardClass}>
          <PromotionsSection
            rows={pricing.promotions}
            onChange={(promotions) => onChange({ ...pricing, promotions })}
          />
        </div>
      </div>
    </div>
  );
}

function BlackoutDatesSection({
  rows,
  onChange,
}: {
  rows: PricingBlackout[];
  onChange: (rows: PricingBlackout[]) => void;
}) {
  const add = (kind: "single" | "range") => {
    onChange([
      ...rows,
      {
        id: uid("blackout"),
        kind,
        fromDate: "",
        toDate: "",
        reason: "",
      },
    ]);
  };

  const update = (id: string, field: keyof PricingBlackout, value: string) => {
    onChange(
      rows.map((row) => {
        if (row.id !== id) return row;
        if (field === "fromDate" && row.kind === "single") {
          return { ...row, fromDate: value, toDate: value };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const remove = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-[760px] px-2 sm:px-0">
          <div className="grid grid-cols-[100px_1fr_1fr_1.4fr_88px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Type</span>
            <span>From Date</span>
            <span>To Date</span>
            <span>Reason</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <p className="text-sm text-gray-400 py-4">
                No blackout dates for this booking range.
              </p>
            )}
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[100px_1fr_1fr_1.4fr_88px] gap-3 py-2.5 items-center"
              >
                <span className="text-xs font-medium text-gray-600">
                  {row.kind === "single" ? "Single" : "Range"}
                </span>
                <DateInput
                  value={row.fromDate}
                  onChange={(value) => update(row.id, "fromDate", value)}
                />
                <DateInput
                  value={row.kind === "single" ? row.fromDate : row.toDate}
                  disabled={row.kind === "single"}
                  onChange={(value) => update(row.id, "toDate", value)}
                />
                <Input
                  type="text"
                  className={tableInputClass}
                  value={row.reason}
                  onChange={(e) => update(row.id, "reason", e.target.value)}
                  placeholder="e.g. Chinese New Year"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={iconBtnClass}
                    title="Delete"
                    onClick={() => remove(row.id)}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => add("single")} className={addButtonDarkClass}>
          <Icon name="Plus" size={14} />
          Add Single Date
        </Button>
        <Button type="button" onClick={() => add("range")} className={addButtonOutlineClass}>
          <Icon name="Plus" size={14} />
          Add Date Range
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main PricingForm                                                          */
/* -------------------------------------------------------------------------- */

export default function PricingForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: PricingFormProps) {
  const [pricingType, setPricingType] = useState<PackagePricingType>(
    initialData?.pricingType ?? "general",
  );
  const [hotelCategories, setHotelCategories] = useState<HotelCategoryPricing[]>(
    () => hydrateCategories(initialData),
  );
  const [activeCategory, setActiveCategory] = useState<HotelCategoryKey>("3star");
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const [activeDepartureId, setActiveDepartureId] = useState<string | null>(null);
  const rangeFromDateRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const departureDateRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const category = hotelCategories.find((item) => item.category === activeCategory)!;

  const selectedRange =
    category.bookingRanges.find((range) => range.id === activeRangeId) ??
    category.bookingRanges[0] ??
    null;

  const selectedMonth =
    category.departureMonths.find((month) => month.id === activeMonthId) ??
    category.departureMonths[0] ??
    null;

  const selectedDeparture =
    selectedMonth?.dates.find((date) => date.id === activeDepartureId) ??
    selectedMonth?.dates[0] ??
    null;

  const editBookingRange = (rangeId: string) => {
    setActiveRangeId(rangeId);
    openDatePicker(rangeFromDateRefs.current[rangeId]);
  };

  const editDepartureDate = (departureId: string) => {
    setActiveDepartureId(departureId);
    openDatePicker(departureDateRefs.current[departureId]);
  };

  const updateCategory = (
    categoryKey: HotelCategoryKey,
    updater: (current: HotelCategoryPricing) => HotelCategoryPricing,
  ) => {
    setHotelCategories((prev) =>
      prev.map((item) => (item.category === categoryKey ? updater(item) : item)),
    );
  };

  const handleSave = () => {
    onNext({
      ...(initialData ?? {}),
      pricingType,
      hotelCategories,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Pricing</h2>
          <Icon name="Info" size={16} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Configure General Package or Fixed Departure pricing by hotel category.
          Each category keeps its own booking ranges or departure dates, adult and
          child tiers, blackouts, and promotions.
        </p>
      </div>

      <div className={sectionCardClass}>
        <h3 className="text-base font-semibold text-[#1F2A44] mb-4">Pricing type</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                value: "general" as const,
                title: "General Package",
                description: "FIT / Solo / Group — customer picks travel date",
              },
              {
                value: "fixed_departure" as const,
                title: "Fixed Departure Package",
                description: "Customer picks from scheduled departure dates",
              },
            ] as const
          ).map((option) => {
            const selected = pricingType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPricingType(option.value)}
                className={`text-left rounded-[12px] border p-4 transition-colors ${
                  selected
                    ? "border-[#B48A2C] bg-[#FFF9EB]"
                    : "border-[#E5E7EB] bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-[#1F2A44]">
                    {option.title}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      selected ? "border-[#B48A2C]" : "border-gray-300"
                    }`}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-[#B48A2C]" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className={sectionCardClass}>
        <h3 className="text-base font-semibold text-[#1F2A44] mb-4">
          Hotel category
        </h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {HOTEL_CATEGORIES.map((tab) => {
            const active = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.key);
                  setActiveRangeId(null);
                  setActiveMonthId(null);
                  setActiveDepartureId(null);
                }}
                className={`h-10 px-5 rounded-[10px] text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1F2A44] text-white"
                    : "bg-white text-[#1F2A44] border border-[#E5E7EB] hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {pricingType === "general" ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-semibold text-[#1F2A44]">
                  Booking ranges
                </h4>
              </div>
              <div className={nestedCardClass}>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <div className="min-w-[700px] px-2 sm:px-0">
                    <div className="grid grid-cols-[1.4fr_1fr_1fr_120px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
                      <span>Booking Range Name</span>
                      <span>From Date</span>
                      <span>To Date</span>
                      <span>Actions</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {category.bookingRanges.map((range) => {
                        const selected = selectedRange?.id === range.id;
                        return (
                          <div
                            key={range.id}
                            className={`grid grid-cols-[1.4fr_1fr_1fr_120px] gap-3 py-2.5 items-center rounded-[8px] ${
                              selected ? "bg-[#FFF9EB]/80" : ""
                            }`}
                          >
                            <Input
                              type="text"
                              className={tableInputClass}
                              value={range.name}
                              onChange={(e) =>
                                updateCategory(activeCategory, (current) => ({
                                  ...current,
                                  bookingRanges: current.bookingRanges.map((item) =>
                                    item.id === range.id
                                      ? { ...item, name: e.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              onFocus={() => setActiveRangeId(range.id)}
                              placeholder="e.g. Low Season"
                            />
                            <DateInput
                              value={range.fromDate}
                              inputRef={(el) => {
                                rangeFromDateRefs.current[range.id] = el;
                              }}
                              onChange={(value) =>
                                updateCategory(activeCategory, (current) => ({
                                  ...current,
                                  bookingRanges: current.bookingRanges.map((item) =>
                                    item.id === range.id
                                      ? { ...item, fromDate: value }
                                      : item,
                                  ),
                                }))
                              }
                              onFocus={() => setActiveRangeId(range.id)}
                            />
                            <DateInput
                              value={range.toDate}
                              onChange={(value) =>
                                updateCategory(activeCategory, (current) => ({
                                  ...current,
                                  bookingRanges: current.bookingRanges.map((item) =>
                                    item.id === range.id
                                      ? { ...item, toDate: value }
                                      : item,
                                  ),
                                }))
                              }
                              onFocus={() => setActiveRangeId(range.id)}
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className={iconBtnClass}
                                title="Edit dates"
                                onClick={() => editBookingRange(range.id)}
                              >
                                <Icon name="Pencil" size={14} />
                              </button>
                              <button
                                type="button"
                                className={iconBtnClass}
                                title="Delete"
                                onClick={() => {
                                  updateCategory(activeCategory, (current) => ({
                                    ...current,
                                    bookingRanges: current.bookingRanges.filter(
                                      (item) => item.id !== range.id,
                                    ),
                                  }));
                                  if (activeRangeId === range.id) {
                                    setActiveRangeId(null);
                                  }
                                }}
                              >
                                <Icon name="Trash2" size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className={addButtonDarkClass}
                    onClick={() =>
                      updateCategory(activeCategory, (current) => {
                        const next = createBookingRange(`Range ${current.bookingRanges.length + 1}`);
                        setActiveRangeId(next.id);
                        return {
                          ...current,
                          bookingRanges: [...current.bookingRanges, next],
                        };
                      })
                    }
                  >
                    <Icon name="Plus" size={14} />
                    Add Booking Range
                  </Button>
                  <Button
                    type="button"
                    className={addButtonOutlineClass}
                    disabled={!selectedRange}
                    onClick={() => {
                      if (!selectedRange) return;
                      updateCategory(activeCategory, (current) => {
                        const duplicate: BookingRange = {
                          ...selectedRange,
                          id: uid("range"),
                          name: `${selectedRange.name || "Range"} (copy)`,
                          blackouts: selectedRange.blackouts.map((row) => ({
                            ...row,
                            id: uid("blackout"),
                          })),
                          pricing: clonePricing(selectedRange.pricing),
                        };
                        setActiveRangeId(duplicate.id);
                        return {
                          ...current,
                          bookingRanges: [...current.bookingRanges, duplicate],
                        };
                      });
                    }}
                  >
                    <Icon name="Copy" size={14} />
                    Duplicate Booking Range
                  </Button>
                </div>
              </div>
            </div>

            {selectedRange ? (
              <div className="space-y-6">
                <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4">
                  <p className="text-sm text-gray-500">
                    Editing pricing for{" "}
                    <span className="font-semibold text-[#1F2A44]">
                      {selectedRange.name || "Untitled range"}
                    </span>
                    {selectedRange.fromDate || selectedRange.toDate
                      ? ` · ${formatDisplayDate(selectedRange.fromDate)} – ${formatDisplayDate(selectedRange.toDate)}`
                      : ""}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">
                    Blackout dates
                  </h4>
                  <div className={nestedCardClass}>
                    <BlackoutDatesSection
                      rows={selectedRange.blackouts}
                      onChange={(blackouts) =>
                        updateCategory(activeCategory, (current) => ({
                          ...current,
                          bookingRanges: current.bookingRanges.map((item) =>
                            item.id === selectedRange.id
                              ? { ...item, blackouts }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>

                <PricingDetailsEditor
                  pricing={selectedRange.pricing}
                  onChange={(pricing) =>
                    updateCategory(activeCategory, (current) => ({
                      ...current,
                      bookingRanges: current.bookingRanges.map((item) =>
                        item.id === selectedRange.id ? { ...item, pricing } : item,
                      ),
                    }))
                  }
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Add a booking range to configure blackouts and pricing.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">
                Departure months
              </h4>
              <div className={nestedCardClass}>
                <div className="space-y-2 mb-3">
                  {category.departureMonths.map((month) => {
                    const selected = selectedMonth?.id === month.id;
                    return (
                      <div
                        key={month.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-[10px] border px-3 py-3 ${
                          selected
                            ? "border-[#B48A2C] bg-[#FFF9EB]"
                            : "border-[#E5E7EB] bg-white"
                        }`}
                      >
                        <div className="flex-1">
                          <Label className={labelClass}>Month</Label>
                          <Input
                            type="month"
                            className={inputClass}
                            value={month.month}
                            onFocus={() => {
                              setActiveMonthId(month.id);
                              setActiveDepartureId(null);
                            }}
                            onChange={(e) =>
                              updateCategory(activeCategory, (current) => ({
                                ...current,
                                departureMonths: current.departureMonths.map((item) =>
                                  item.id === month.id
                                    ? { ...item, month: e.target.value }
                                    : item,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2 sm:pt-6">
                          <span className="text-sm text-gray-500 min-w-[110px]">
                            {formatMonthLabel(month.month)}
                          </span>
                          <button
                            type="button"
                            className={iconBtnClass}
                            title="Edit dates"
                            onClick={() => {
                              setActiveMonthId(month.id);
                              setActiveDepartureId(null);
                            }}
                          >
                            <Icon name="Pencil" size={14} />
                          </button>
                          <button
                            type="button"
                            className={iconBtnClass}
                            title="Delete month"
                            onClick={() => {
                              updateCategory(activeCategory, (current) => ({
                                ...current,
                                departureMonths: current.departureMonths.filter(
                                  (item) => item.id !== month.id,
                                ),
                              }));
                              if (activeMonthId === month.id) {
                                setActiveMonthId(null);
                                setActiveDepartureId(null);
                              }
                            }}
                          >
                            <Icon name="Trash2" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  className={addButtonDarkClass}
                  onClick={() =>
                    updateCategory(activeCategory, (current) => {
                      const next = createDepartureMonth();
                      setActiveMonthId(next.id);
                      setActiveDepartureId(next.dates[0]?.id ?? null);
                      return {
                        ...current,
                        departureMonths: [...current.departureMonths, next],
                      };
                    })
                  }
                >
                  <Icon name="Plus" size={14} />
                  Add Month
                </Button>
              </div>
            </div>

            {selectedMonth ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-[#1F2A44] mb-3">
                    Departure dates · {formatMonthLabel(selectedMonth.month)}
                  </h4>
                  <div className={nestedCardClass}>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <div className="min-w-[640px] px-2 sm:px-0">
                        <div className="grid grid-cols-[1.2fr_1.4fr_120px] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
                          <span>Departure Date</span>
                          <span>Status</span>
                          <span>Actions</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {selectedMonth.dates.map((dep) => {
                            const selected = selectedDeparture?.id === dep.id;
                            return (
                              <div
                                key={dep.id}
                                className={`grid grid-cols-[1.2fr_1.4fr_120px] gap-3 py-2.5 items-center ${
                                  selected ? "bg-[#FFF9EB]/80" : ""
                                }`}
                              >
                                <DateInput
                                  value={dep.date}
                                  inputRef={(el) => {
                                    departureDateRefs.current[dep.id] = el;
                                  }}
                                  onFocus={() => setActiveDepartureId(dep.id)}
                                  onChange={(value) =>
                                    updateCategory(activeCategory, (current) => ({
                                      ...current,
                                      departureMonths: current.departureMonths.map(
                                        (month) =>
                                          month.id === selectedMonth.id
                                            ? {
                                                ...month,
                                                dates: month.dates.map((item) =>
                                                  item.id === dep.id
                                                    ? {
                                                        ...item,
                                                        date: value,
                                                      }
                                                    : item,
                                                ),
                                              }
                                            : month,
                                      ),
                                    }))
                                  }
                                />
                                <NativeSelect
                                  className={tableInputClass}
                                  value={dep.status}
                                  onFocus={() => setActiveDepartureId(dep.id)}
                                  onChange={(e) =>
                                    updateCategory(activeCategory, (current) => ({
                                      ...current,
                                      departureMonths: current.departureMonths.map(
                                        (month) =>
                                          month.id === selectedMonth.id
                                            ? {
                                                ...month,
                                                dates: month.dates.map((item) =>
                                                  item.id === dep.id
                                                    ? {
                                                        ...item,
                                                        status: e.target
                                                          .value as DepartureStatus,
                                                      }
                                                    : item,
                                                ),
                                              }
                                            : month,
                                      ),
                                    }))
                                  }
                                >
                                  {DEPARTURE_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </NativeSelect>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    className={iconBtnClass}
                                    title="Edit date"
                                    onClick={() => editDepartureDate(dep.id)}
                                  >
                                    <Icon name="Pencil" size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={iconBtnClass}
                                    title="Delete"
                                    onClick={() => {
                                      updateCategory(activeCategory, (current) => ({
                                        ...current,
                                        departureMonths: current.departureMonths.map(
                                          (month) =>
                                            month.id === selectedMonth.id
                                              ? {
                                                  ...month,
                                                  dates: month.dates.filter(
                                                    (item) => item.id !== dep.id,
                                                  ),
                                                }
                                              : month,
                                        ),
                                      }));
                                      if (activeDepartureId === dep.id) {
                                        setActiveDepartureId(null);
                                      }
                                    }}
                                  >
                                    <Icon name="Trash2" size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className={addButtonDarkClass}
                        onClick={() => {
                          const next = createDepartureDate();
                          updateCategory(activeCategory, (current) => ({
                            ...current,
                            departureMonths: current.departureMonths.map((month) =>
                              month.id === selectedMonth.id
                                ? { ...month, dates: [...month.dates, next] }
                                : month,
                            ),
                          }));
                          setActiveDepartureId(next.id);
                        }}
                      >
                        <Icon name="Plus" size={14} />
                        Add Departure Date
                      </Button>
                      <Button
                        type="button"
                        className={addButtonOutlineClass}
                        disabled={!selectedDeparture}
                        onClick={() => {
                          if (!selectedDeparture) return;
                          const duplicate: DepartureDateEntry = {
                            ...selectedDeparture,
                            id: uid("dep"),
                            pricing: clonePricing(selectedDeparture.pricing),
                          };
                          updateCategory(activeCategory, (current) => ({
                            ...current,
                            departureMonths: current.departureMonths.map((month) =>
                              month.id === selectedMonth.id
                                ? {
                                    ...month,
                                    dates: [...month.dates, duplicate],
                                  }
                                : month,
                            ),
                          }));
                          setActiveDepartureId(duplicate.id);
                        }}
                      >
                        <Icon name="Copy" size={14} />
                        Duplicate Departure Date
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedDeparture ? (
                  <div className="space-y-4">
                    <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4">
                      <p className="text-sm text-gray-500">
                        Editing pricing for departure{" "}
                        <span className="font-semibold text-[#1F2A44]">
                          {formatDisplayDate(selectedDeparture.date)}
                        </span>
                      </p>
                    </div>
                    <PricingDetailsEditor
                      pricing={selectedDeparture.pricing}
                      onChange={(pricing) =>
                        updateCategory(activeCategory, (current) => ({
                          ...current,
                          departureMonths: current.departureMonths.map((month) =>
                            month.id === selectedMonth.id
                              ? {
                                  ...month,
                                  dates: month.dates.map((item) =>
                                    item.id === selectedDeparture.id
                                      ? { ...item, pricing }
                                      : item,
                                  ),
                                }
                              : month,
                          ),
                        }))
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Add a departure date to configure pricing.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Add a departure month to manage dates and pricing.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}
        >
          <Icon name="ChevronLeft" size={14} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          data-package-step-save="" className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={14} />
        </Button>
      </div>
    </div>
  );
}
