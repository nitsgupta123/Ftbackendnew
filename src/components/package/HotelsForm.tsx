"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";
const VISIBILITY_OPTIONS = ["Internal only", "Frontend visible", "Hidden"];

// ── Pill-shaped toggle card ──────────────────────────────────────────────
function ToggleCard({
  label,
  active,
  onChange
}: {
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return <div className="
        flex items-center justify-between
        bg-white border border-[#E5E7EB] rounded-[12px]
        px-5 py-[18px]
        transition-all duration-200 ease-in-out
        cursor-pointer select-none
        hover:border-gray-300
      " onClick={() => onChange(!active)}>
      
      {/* Label — bold, dark navy/black sans-serif */}
      <span className="text-sm font-bold text-[#1F2A44] whitespace-nowrap">
        {label}
      </span>

      {/* Right side: status text + pill switch */}
      <div className="flex items-center gap-3">
        {/* Status text */}
        <span className={`text-sm font-semibold ${active ? "text-[#16A34A]" : "text-[#64748B]"}`}>
          
          {active ? "Yes" : "No"}
        </span>

        {/* Toggle switch pill */}
        <div role="switch" aria-checked={active} className={`
            relative inline-flex h-[26px] w-[46px] items-center rounded-full flex-shrink-0
            transition-colors duration-300 ease-in-out
            ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}
          `}>
          
          <span className={`
              inline-block h-[20px] w-[20px] transform rounded-full bg-white
              shadow-sm ring-0 transition-transform duration-300 ease-in-out
              ${active ? "translate-x-[23px]" : "translate-x-[3px]"}
            `} />
          
        </div>
      </div>
    </div>;
}
import type { HotelEntry } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface HotelsFormProps extends StepFormBaseProps {
  onNext: (data: HotelEntry[]) => void;
  onPrevious: () => void;
  initialData?: HotelEntry[] | null;
}

// ── Main HotelsForm component ────────────────────────────────────────────
export default function HotelsForm({
  onNext,
  onPrevious,
  isSaving = false
}: HotelsFormProps) {
  const [formData, setFormData] = useState({
    hotelName: "",
    city: "",
    starRating: "",
    roomType: "",
    nights: "",
    childPolicy: "",
    maxOccupancy: "",
    address: "",
    googleMapsLink: ""
  });
  const [visibility, setVisibility] = useState("Internal only");
  const [internalNotes, setInternalNotes] = useState("");
  const [breakfastIncluded, setBreakfastIncluded] = useState(true);
  const [halalBreakfast, setHalalBreakfast] = useState(false);
  const [connectingRooms, setConnectingRooms] = useState(false);
  const [extraBed, setExtraBed] = useState(false);
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ── Shared classes ─────────────────────────────────────────────────────
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors hover:border-gray-300";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center] pr-10`;
  return <div className="space-y-6 animate-fade-in">
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h2 className="text-lg font-semibold text-[#1F2A44]">Hotels</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Use this for likely or sample hotels. Confirmation status belongs
          later inside booking fulfilment, not package upload.
        </p>
      </div>

      {/* ── Form body ──────────────────────────────────────────────── */}
      <div className="p-6">
        {/* ── 3-Column Input Grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mb-6">
          {/* Row 1 */}
          <div>
            <Label className={labelClass}>Hotel name</Label>
            <Input type="text" placeholder="Enter hotel name" value={formData.hotelName} onChange={e => handleInputChange("hotelName", e.target.value)} className={inputClass} />
              
          </div>

          <div>
            <Label className={labelClass}>City</Label>
            <Input type="text" placeholder="Enter city" value={formData.city} onChange={e => handleInputChange("city", e.target.value)} className={inputClass} />
              
          </div>

          <div>
            <Label className={labelClass}>Star rating</Label>
            <Input type="text" placeholder="e.g., 5" value={formData.starRating} onChange={e => handleInputChange("starRating", e.target.value)} className={inputClass} />
              
          </div>

          {/* Row 2 */}
          <div>
            <Label className={labelClass}>Room type</Label>
            <Input type="text" placeholder="e.g., Deluxe" value={formData.roomType} onChange={e => handleInputChange("roomType", e.target.value)} className={inputClass} />
              
          </div>

          <div>
            <Label className={labelClass}>Nights</Label>
            <Input type="number" min="1" placeholder="e.g., 3" value={formData.nights} onChange={e => handleInputChange("nights", e.target.value)} className={inputClass} />
              
          </div>

          <div>
            <Label className={labelClass}>Child policy</Label>
            <Input type="text" placeholder="e.g., Free under 12" value={formData.childPolicy} onChange={e => handleInputChange("childPolicy", e.target.value)} className={inputClass} />
              
          </div>

          {/* Row 3 */}
          <div>
            <Label className={labelClass}>Max occupancy</Label>
            <Input type="number" min="1" placeholder="e.g., 3" value={formData.maxOccupancy} onChange={e => handleInputChange("maxOccupancy", e.target.value)} className={inputClass} />
              
          </div>

          <div>
            <Label className={labelClass}>Address</Label>
            <Input type="text" placeholder="Hotel full address" value={formData.address} onChange={e => handleInputChange("address", e.target.value)} className={inputClass} />
              
          </div>

          <div>
            <Label className={labelClass}>Google Maps link</Label>
            <Input type="url" placeholder="https://maps.google.com/..." value={formData.googleMapsLink} onChange={e => handleInputChange("googleMapsLink", e.target.value)} className={inputClass} />
              
          </div>
        </div>

        {/* ── Visibility Dropdown + Internal Notes ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5 mb-6">
          {/* Visibility dropdown — spans 1 column */}
          <div>
            <Label className={labelClass}>Front-end visibility</Label>
            <NativeSelect value={visibility} onChange={e => setVisibility(e.target.value)} className={selectClass} style={{
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "16px",
              paddingRight: "40px"
            }}>
                
              {VISIBILITY_OPTIONS.map(opt => <option key={opt} value={opt}>
                  {opt}
                </option>)}
            </NativeSelect>
          </div>

          {/* Internal notes — spans 2 columns */}
          <div className="lg:col-span-2">
            <Label className={labelClass}>Internal notes</Label>
            <Textarea rows={3} placeholder="Add any internal notes about this hotel..." value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors hover:border-gray-300 resize-y min-h-[48px]" />
              
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────────── */}
        <div className="border-t border-[#E5E7EB] my-6" />

        {/* ── Interactive Status Toggles ───────────────────────────── */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Hotel Features & Status
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ToggleCard label="Breakfast included" active={breakfastIncluded} onChange={setBreakfastIncluded} />
              
            <ToggleCard label="Halal breakfast" active={halalBreakfast} onChange={setHalalBreakfast} />
              
            <ToggleCard label="Connecting rooms" active={connectingRooms} onChange={setConnectingRooms} />
              
            <ToggleCard label="Extra bed" active={extraBed} onChange={setExtraBed} />
              
          </div>
        </div>
      </div>
    </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          ... Incomplete sections stay as draft.
        </p>

        <Button type="button" onClick={() => onNext([{
        ...formData,
        visibility,
        internalNotes,
        breakfastIncluded,
        halalBreakfast,
        connectingRooms,
        extraBed
      }])} disabled={isSaving} className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>;
}
