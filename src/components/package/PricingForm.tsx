"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";
import type { BlackoutRow, PricingData, PricingPaxRow } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
interface PricingFormProps extends StepFormBaseProps {
  onNext: (data: PricingData) => void;
  onPrevious: () => void;
  initialData?: PricingData | null;
}
const addButtonClass = "mt-3 w-fit h-10 px-5 text-sm font-medium rounded-[10px] transition-colors flex items-center gap-2";
const addButtonDarkClass = `${addButtonClass} text-white bg-[#1F2A44] hover:bg-[#1F2A44]/90`;
const addButtonGoldClass = `${addButtonClass} text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90`;

/* -------------------------------------------------------------------------- */
/*  Reusable ToggleSwitch                                                     */
/* -------------------------------------------------------------------------- */
function ToggleSwitch({
  label,
  subtext,
  enabled,
  onChange
}: {
  label: string;
  subtext?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
      <Button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)} className={`
          relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0
          transition-colors duration-200 ease-in-out
          ${enabled ? "bg-[#A8832A]" : "bg-gray-300"}
        `}>
        
        <span className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
            ring-0 transition duration-200 ease-in-out
            ${enabled ? "translate-x-6" : "translate-x-1"}
          `} />
        
      </Button>
    </div>;
}

/* -------------------------------------------------------------------------- */
/*  Reusable Pill Tag                                                         */
/* -------------------------------------------------------------------------- */
function PillTag({
  label
}: {
  label: string;
}) {
  return <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-[#A8832A] border border-[#A8832A]/40 rounded-full bg-[#FFF9EB]">
      {label}
    </span>;
}

/* -------------------------------------------------------------------------- */
/*  Pricing Table (Scrollable)                                                */
/* -------------------------------------------------------------------------- */
type PaxRow = PricingPaxRow;
const initialPaxRows: PaxRow[] = [{
  id: "1",
  tier: "2 adults",
  adultNet: "",
  adultSelling: "",
  childWithBedNet: ""
}, {
  id: "2",
  tier: "3 adults",
  adultNet: "",
  adultSelling: "",
  childWithBedNet: ""
}, {
  id: "3",
  tier: "4 adults",
  adultNet: "",
  adultSelling: "",
  childWithBedNet: ""
}];
function PricingTable({
  rows,
  onRowsChange
}: {
  rows: PaxRow[];
  onRowsChange: (rows: PaxRow[]) => void;
}) {
  const addRow = () => {
    const newId = String(Date.now());
    onRowsChange([...rows, {
      id: newId,
      tier: "",
      adultNet: "",
      adultSelling: "",
      childWithBedNet: ""
    }]);
  };
  const updateRow = (id: string, field: keyof PaxRow, value: string) => {
    onRowsChange(rows.map(row => row.id === id ? {
      ...row,
      [field]: value
    } : row));
  };
  return <div>
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <div className="min-w-[700px] px-6 sm:px-0">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Pax tier</span>
            <span>Adult net</span>
            <span>Adult selling</span>
            <span>Child with bed net</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-50">
            {rows.map(row => <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 py-2.5 items-center">
              
                <Input type="text" placeholder="e.g., 2 adults" value={row.tier} onChange={e => updateRow(row.id, "tier", e.target.value)} className="w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors" />
              
                <Input type="text" placeholder="0.00" value={row.adultNet} onChange={e => updateRow(row.id, "adultNet", e.target.value)} className="w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors" />
              
                <Input type="text" placeholder="0.00" value={row.adultSelling} onChange={e => updateRow(row.id, "adultSelling", e.target.value)} className="w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors" />
              
                <Input type="text" placeholder="0.00" value={row.childWithBedNet} onChange={e => updateRow(row.id, "childWithBedNet", e.target.value)} className="w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors" />
              
              </div>)}
          </div>
        </div>
      </div>

      {/* Add Pax Tier Button */}
      <Button type="button" onClick={addRow} className={addButtonDarkClass}>
        
        <Icon name="CheckCheck" size={14} />
        + Add pax tier
      </Button>
    </div>;
}

/* -------------------------------------------------------------------------- */
/*  Blackout Dates Table (Scrollable)                                         */
/* -------------------------------------------------------------------------- */
type BlackoutRowLocal = BlackoutRow;
function BlackoutDatesTable({
  rows,
  onRowsChange
}: {
  rows: BlackoutRowLocal[];
  onRowsChange: (rows: BlackoutRowLocal[]) => void;
}) {
  const addRow = () => {
    onRowsChange([...rows, {
      id: String(Date.now()),
      startDate: "",
      endDate: "",
      appliesTo: ""
    }]);
  };
  const updateRow = (id: string, field: keyof BlackoutRowLocal, value: string) => {
    onRowsChange(rows.map(row => row.id === id ? {
      ...row,
      [field]: value
    } : row));
  };
  return <div>
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <div className="min-w-[600px] px-6 sm:px-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 text-xs font-semibold text-[#1F2A44] uppercase tracking-wide pb-3 border-b border-gray-100">
            <span>Start date</span>
            <span>End date</span>
            <span>Applies to</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-50">
            {rows.map(row => <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr] gap-3 py-2.5 items-center">
              
                <div className="relative">
                  <Input type="date" value={row.startDate} onChange={e => updateRow(row.id, "startDate", e.target.value)} className="w-full h-[40px] px-3 pl-9 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors" placeholder="dd-mm-yyyy" />
                
                  <Icon name="Calendar" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                
                </div>
                <div className="relative">
                  <Input type="date" value={row.endDate} onChange={e => updateRow(row.id, "endDate", e.target.value)} className="w-full h-[40px] px-3 pl-9 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors" placeholder="dd-mm-yyyy" />
                
                  <Icon name="Calendar" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                
                </div>
                <NativeSelect value={row.appliesTo} onChange={e => updateRow(row.id, "appliesTo", e.target.value)} className="w-full h-[40px] px-3 text-sm border border-[#E5E7EB] rounded-[8px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors">
                
                  <option value="">Select</option>
                  <option value="all">All hotels & categories</option>
                  <option value="4star">4-star only</option>
                  <option value="5star">5-star only</option>
                  <option value="custom">Custom selection</option>
                </NativeSelect>
              </div>)}
          </div>
        </div>
      </div>

      {/* Add Blackout Button */}
      <Button type="button" onClick={addRow} className={addButtonDarkClass}>
        
        <Icon name="CheckCheck" size={14} />
        + Add blackout date
      </Button>
    </div>;
}

/* -------------------------------------------------------------------------- */
/*  Main PricingForm Component                                                */
/* -------------------------------------------------------------------------- */
export default function PricingForm({
  onNext,
  onPrevious,
  isSaving = false
}: PricingFormProps) {
  const [showSlashedRate, setShowSlashedRate] = useState(false);
  const [supplierCurrency, setSupplierCurrency] = useState("SGD");
  const [displayCurrency, setDisplayCurrency] = useState("SGD");
  const [pricingCalculation, setPricingCalculation] = useState("auto");
  const [exchangeRateType, setExchangeRateType] = useState("manual");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateLockedUntil, setRateLockedUntil] = useState("");
  const [markupType, setMarkupType] = useState("percentage");
  const [markupValue, setMarkupValue] = useState("");
  const [minimumMarginAlert, setMinimumMarginAlert] = useState("");
  const [originalPriceLabel, setOriginalPriceLabel] = useState("");
  const [discountedPriceLabel, setDiscountedPriceLabel] = useState("");
  const [promotionStart, setPromotionStart] = useState("");
  const [promotionEnd, setPromotionEnd] = useState("");
  const [promoDisplayNote, setPromoDisplayNote] = useState("");
  const [hotelCategory, setHotelCategory] = useState("4star");
  const [defaultRoomBasis, setDefaultRoomBasis] = useState("twin");
  const [hotelPricingNotes, setHotelPricingNotes] = useState("Based on 4-star");
  const [childPricingRules, setChildPricingRules] = useState("");
  const [paxRows, setPaxRows] = useState<PaxRow[]>(initialPaxRows);
  const [blackoutRows, setBlackoutRows] = useState<BlackoutRowLocal[]>([{
    id: "1",
    startDate: "",
    endDate: "",
    appliesTo: ""
  }]);
  const handleSave = () => {
    onNext({
      supplierCurrency,
      displayCurrency,
      pricingCalculation,
      exchangeRateType,
      exchangeRate,
      rateLockedUntil,
      markupType,
      markupValue,
      minimumMarginAlert,
      showSlashedRate,
      originalPriceLabel,
      discountedPriceLabel,
      promotionStart,
      promotionEnd,
      promoDisplayNote,
      hotelCategory,
      defaultRoomBasis,
      hotelPricingNotes,
      childPricingRules,
      paxRows,
      blackoutDates: blackoutRows
    });
  };
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  return <div className="space-y-6 animate-fade-in">
      {/* ================================================================== */}
      {/*  1. SECTION HEADER                                                 */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Pricing</h2>
          <Icon name="Info" size={16} className="text-gray-400 cursor-help" />
          
        </div>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Pricing is grouped by hotel category, then pax tier. Blackout dates
          are separate so one-day blackout periods do not get buried in a text
          box.
        </p>
      </div>

      {/* ================================================================== */}
      {/*  2. BLUE INFO BANNER                                               */}
      {/* ================================================================== */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[12px] p-4 flex items-start gap-3">
        <Icon name="Info" size={16} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
        
        <p className="text-sm text-[#1E3A5F] leading-relaxed">
          <span className="font-semibold">Supplier pricing</span> is entered
          here first. Selling prices can either be calculated automatically using
          exchange rate plus markup, or manually overridden by Product or Finance.
        </p>
      </div>

      {/* ================================================================== */}
      {/*  3. YELLOW PRICING GUIDE BOX                                       */}
      {/* ================================================================== */}
      <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-[12px] p-4">
        <p className="text-sm text-[#92400E] mb-3 leading-relaxed">
          Each field below flows through the pricing engine. Use the inline
          tooltips for context on what each term means and where it appears in
          the selling price calculation.
        </p>
        <div className="flex flex-wrap gap-2">
          <PillTag label="Supplier net rate" />
          <PillTag label="Exchange rate" />
          <PillTag label="Markup" />
          <PillTag label="Promo pricing" />
          <PillTag label="Finance approval" />
        </div>
      </div>

      {/* ================================================================== */}
      {/*  4. PRICING CONFIGURATION (3-COLUMN GRID)                           */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <h3 className="text-base font-semibold text-[#1F2A44] mb-5">
          Pricing configuration
        </h3>

        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 mb-5">
          <div>
            <Label className={labelClass}>Supplier currency</Label>
            <NativeSelect className={inputClass} value={supplierCurrency} onChange={e => setSupplierCurrency(e.target.value)}>
              
              <option value="SGD">SGD - Singapore Dollar</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="THB">THB - Thai Baht</option>
              <option value="IDR">IDR - Indonesian Rupiah</option>
              <option value="MYR">MYR - Malaysian Ringgit</option>
              <option value="INR">INR - Indian Rupee</option>
            </NativeSelect>
          </div>
          <div>
            <Label className={labelClass}>Display currency</Label>
            <NativeSelect className={inputClass} value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}>
              
              <option value="SGD">SGD - Singapore Dollar</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="AED">AED - UAE Dirham</option>
            </NativeSelect>
          </div>
          <div>
            <Label className={labelClass}>Pricing calculation</Label>
            <NativeSelect className={inputClass} value={pricingCalculation} onChange={e => setPricingCalculation(e.target.value)}>
              
              <option value="auto">Auto calculate for selling price</option>
              <option value="manual">Manual override</option>
              <option value="hybrid">Hybrid (auto + manual)</option>
            </NativeSelect>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 mb-5">
          <div>
            <Label className={labelClass}>Exchange rate type</Label>
            <NativeSelect className={inputClass} value={exchangeRateType} onChange={e => setExchangeRateType(e.target.value)}>
              
              <option value="manual">Manual</option>
              <option value="auto">Auto (live feed)</option>
              <option value="fixed">Fixed rate</option>
            </NativeSelect>
          </div>
          <div>
            <Label className={labelClass}>Exchange rate used</Label>
            <Input type="text" placeholder="Example: 1 ZAR =" className={inputClass} value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
            
          </div>
          <div>
            <Label className={labelClass}>Rate locked until</Label>
            <div className="relative">
              <Input type="date" className={`${inputClass} pl-10`} value={rateLockedUntil} onChange={e => setRateLockedUntil(e.target.value)} />
              
              <Icon name="Calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
          <div>
            <Label className={labelClass}>Markup type</Label>
            <NativeSelect className={inputClass} value={markupType} onChange={e => setMarkupType(e.target.value)}>
              
              <option value="percentage">Percentage markup</option>
              <option value="fixed">Fixed amount</option>
              <option value="tiered">Tiered markup</option>
            </NativeSelect>
          </div>
          <div>
            <Label className={labelClass}>Markup value</Label>
            <Input type="text" placeholder="Example: 18% or 0.18" className={inputClass} value={markupValue} onChange={e => setMarkupValue(e.target.value)} />
            
          </div>
          <div>
            <Label className={labelClass}>Minimum margin alert</Label>
            <Input type="text" placeholder="Example: 12%" className={inputClass} value={minimumMarginAlert} onChange={e => setMinimumMarginAlert(e.target.value)} />
            
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  5. DISCOUNTED / SLASHED RATE BOX                                   */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <h3 className="text-base font-semibold text-[#1F2A44] mb-5 pb-4 border-b border-gray-100">
          Discounted or slashed rate display
        </h3>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left – Toggle card */}
          <div className="w-full lg:w-[300px] flex-shrink-0">
            <div className="bg-[#F8F9FB] rounded-[12px] border border-[#E5E7EB] p-4">
              <ToggleSwitch label="Show slashed rate on front-end" subtext="Use only for genuine promotion or campaign pricing." enabled={showSlashedRate} onChange={setShowSlashedRate} />
              
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">
                  Current:
                </span>
                <span className={`inline-flex items-center px-3 py-0.5 text-xs font-semibold rounded-full ${showSlashedRate ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                  
                  {showSlashedRate ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Right – Grid fields */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <div>
                <Label className={labelClass}>Original price label</Label>
                <Input type="text" placeholder="Example: Was S" className={inputClass} value={originalPriceLabel} onChange={e => setOriginalPriceLabel(e.target.value)} />
                
              </div>
              <div>
                <Label className={labelClass}>Discounted price label</Label>
                <Input type="text" placeholder="Example: Now fr" className={inputClass} value={discountedPriceLabel} onChange={e => setDiscountedPriceLabel(e.target.value)} />
                
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <Label className={labelClass}>Promotion start</Label>
                <div className="relative">
                  <Input type="date" className={`${inputClass} pl-10`} value={promotionStart} onChange={e => setPromotionStart(e.target.value)} />
                  
                  <Icon name="Calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  
                </div>
              </div>
              <div>
                <Label className={labelClass}>Promotion end</Label>
                <div className="relative">
                  <Input type="date" className={`${inputClass} pl-10`} value={promotionEnd} onChange={e => setPromotionEnd(e.target.value)} />
                  
                  <Icon name="Calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  
                </div>
              </div>
              <div>
                <Label className={labelClass}>Promo display note</Label>
                <Input type="text" placeholder="Example: Valid fi..." className={inputClass} value={promoDisplayNote} onChange={e => setPromoDisplayNote(e.target.value)} />
                
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  6. HOTEL CATEGORY PRICING CARD                                     */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <h3 className="text-base font-semibold text-[#1F2A44] mb-5">
          Hotel category pricing
        </h3>

        {/* Dropdowns + Note */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr] gap-x-6 gap-y-4 mb-6">
          <div>
            <Label className={labelClass}>Hotel category</Label>
            <NativeSelect className={inputClass} value={hotelCategory} onChange={e => setHotelCategory(e.target.value)}>
              
              <option value="3star">3-star</option>
              <option value="4star">4-star</option>
              <option value="5star">5-star</option>
              <option value="boutique">Boutique</option>
              <option value="luxury">Luxury</option>
            </NativeSelect>
          </div>
          <div>
            <Label className={labelClass}>Default room basis</Label>
            <NativeSelect className={inputClass} value={defaultRoomBasis} onChange={e => setDefaultRoomBasis(e.target.value)}>
              
              <option value="twin">Twin sharing</option>
              <option value="double">Double</option>
              <option value="single">Single</option>
              <option value="triple">Triple</option>
            </NativeSelect>
          </div>
          <div>
            <Label className={labelClass}>Hotel / pricing notes</Label>
            <Input type="text" placeholder="Based on 4-star..." className={inputClass} value={hotelPricingNotes} onChange={e => setHotelPricingNotes(e.target.value)} />
            
          </div>
        </div>

        {/* Scrollable Pricing Table */}
        <div className="bg-[#F8F9FB] rounded-[12px] border border-[#E5E7EB] p-4">
          <PricingTable rows={paxRows} onRowsChange={setPaxRows} />

          {/* Add Hotel Category Pricing Button */}
          <Button type="button" className={addButtonGoldClass}>
            <Icon name="CheckCheck" size={14} />
            + Add hotel category pricing
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/*  7. BLACKOUT DATES CARD                                             */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <h3 className="text-base font-semibold text-[#1F2A44] mb-5">
          Blackout dates
        </h3>
        <p className="text-sm text-gray-400 mb-5">
          One-day or multi-day windows where pricing is not available. These can
          be applied per hotel category or across all categories.
        </p>

        <div className="bg-[#F8F9FB] rounded-[12px] border border-[#E5E7EB] p-4">
          <BlackoutDatesTable rows={blackoutRows} onRowsChange={setBlackoutRows} />
        </div>
      </div>

      {/* ================================================================== */}
      {/*  8. CHILD PRICING RULES TEXTAREA                                    */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <Label className="block text-sm font-semibold text-[#1F2A44] mb-2">
          Child pricing rules
        </Label>
        <Textarea placeholder="Explain child with bed, child without bed, infant age cut-offs and extra bed rules." className="w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y" value={childPricingRules} onChange={e => setChildPricingRules(e.target.value)} />
        
      </div>

      {/* ================================================================== */}
      {/*  9. BOTTOM ACTION FOOTER                                            */}
      {/* ================================================================== */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={14} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          ...complete sections stay as draft.
        </p>

        <Button type="button" onClick={handleSave} disabled={isSaving} className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={14} />
        </Button>
      </div>
    </div>;
}
