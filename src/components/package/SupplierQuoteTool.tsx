"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";
import type { SupplierQuoteToolData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface SupplierQuoteToolProps extends StepFormBaseProps {
  onNext: (data: SupplierQuoteToolData) => void;
  onPrevious: () => void;
  initialData?: SupplierQuoteToolData | null;
}
function ToggleCard({
  label,
  active,
  onChange
}: {
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-[18px] transition-all duration-200 ease-in-out cursor-pointer select-none hover:border-gray-300" onClick={() => onChange(!active)}>
      
      <span className="text-sm font-bold text-[#1F2A44]">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${active ? "text-[#16A34A]" : "text-[#64748B]"}`}>
          
          {active ? "Yes" : "No"}
        </span>
        <div role="switch" aria-checked={active} className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full flex-shrink-0 transition-colors duration-300 ease-in-out ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}>
          
          <span className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${active ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
          
        </div>
      </div>
    </div>;
}
export default function SupplierQuoteTool({
  onNext,
  onPrevious,
  isSaving = false
}: SupplierQuoteToolProps) {
  const [formData, setFormData] = useState({
    quoteRequestType: "updated-rate",
    supplierToSendTo: "",
    basedOnPackage: "",
    replyDeadline: "",
    clientTravelDates: "",
    adults: "",
    children: "",
    childrenAges: "",
    hotelPreference: "",
    rooming: "",
    mealRequirements: "",
    requestedChanges: "",
    negotiationNote: "",
    includeDayByDayItinerary: true,
    includeClientBudget: false
  });
  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10`;
  const labelClass = "block text-sm font-bold text-[#1F2A44] mb-2";
  const textareaClass = "w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const supplierName = formData.supplierToSendTo || "[Supplier Name]";
  const packageName = formData.basedOnPackage || "[Package Name]";
  const travelDates = formData.clientTravelDates || "[Travel dates]";
  const adults = formData.adults || "[Adults]";
  const children = formData.children || "0";
  const hotelPref = formData.hotelPreference || "[Hotel preference]";
  const rooming = formData.rooming || "[Rooming details]";
  const mealReq = formData.mealRequirements || "[Meal requirement]";
  const requestedChangesDisplay = formData.requestedChanges.trim() || "No";
  const handleSubmit = () => {
    onNext(formData);
  };
  return <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in relative">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h2 className="text-lg font-bold text-[#1F2A44]">Supplier Quote Tool</h2>
        <p className="text-sm text-gray-400 mt-1">
          Consultants can send the package to a supplier without exposing Fayyaz
          pricing or internal notes.
        </p>
      </div>

      <div className="p-6 pb-0">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Left: Form fields */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <Label htmlFor="quoteRequestType" className={labelClass}>
                  Quote request type
                </Label>
                <NativeSelect id="quoteRequestType" className={selectClass} value={formData.quoteRequestType} onChange={e => updateField("quoteRequestType", e.target.value)}>
                  
                  <option value="updated-rate">Updated rate request</option>
                  <option value="new-enquiry">New client enquiry</option>
                  <option value="amendment">Amendment request</option>
                  <option value="reconfirmation">Reconfirmation</option>
                </NativeSelect>
              </div>

              <div>
                <Label htmlFor="supplierToSendTo" className={labelClass}>
                  Supplier to send to
                </Label>
                <Input id="supplierToSendTo" type="text" placeholder="Supplier name or contact" className={inputClass} value={formData.supplierToSendTo} onChange={e => updateField("supplierToSendTo", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="basedOnPackage" className={labelClass}>
                  Based on supplier package
                </Label>
                <Input id="basedOnPackage" type="text" placeholder="Package name or reference" className={inputClass} value={formData.basedOnPackage} onChange={e => updateField("basedOnPackage", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="replyDeadline" className={labelClass}>
                  Reply deadline
                </Label>
                <div className="relative">
                  <Input id="replyDeadline" type="date" className={`${inputClass} pl-10`} value={formData.replyDeadline} onChange={e => updateField("replyDeadline", e.target.value)} />
                  
                  <Icon name="Calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  
                </div>
              </div>

              <div>
                <Label htmlFor="clientTravelDates" className={labelClass}>
                  Client travel dates
                </Label>
                <Input id="clientTravelDates" type="text" placeholder="e.g. 15–22 Aug 2026" className={inputClass} value={formData.clientTravelDates} onChange={e => updateField("clientTravelDates", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="adults" className={labelClass}>
                  Adults
                </Label>
                <Input id="adults" type="number" min="0" placeholder="2" className={inputClass} value={formData.adults} onChange={e => updateField("adults", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="children" className={labelClass}>
                  Children
                </Label>
                <Input id="children" type="number" min="0" placeholder="0" className={inputClass} value={formData.children} onChange={e => updateField("children", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="childrenAges" className={labelClass}>
                  Children&apos;s ages
                </Label>
                <Input id="childrenAges" type="text" placeholder="e.g. 6, 9" className={inputClass} value={formData.childrenAges} onChange={e => updateField("childrenAges", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="hotelPreference" className={labelClass}>
                  Hotel preference
                </Label>
                <Input id="hotelPreference" type="text" placeholder="e.g. 4-star central" className={inputClass} value={formData.hotelPreference} onChange={e => updateField("hotelPreference", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="rooming" className={labelClass}>
                  Rooming
                </Label>
                <Input id="rooming" type="text" placeholder="e.g. 1 double + 1 twin" className={inputClass} value={formData.rooming} onChange={e => updateField("rooming", e.target.value)} />
                
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <Label htmlFor="mealRequirements" className={labelClass}>
                  Meal requirements
                </Label>
                <Input id="mealRequirements" type="text" placeholder="e.g. Halal where possible" className={inputClass} value={formData.mealRequirements} onChange={e => updateField("mealRequirements", e.target.value)} />
                
              </div>

              <div>
                <Label htmlFor="requestedChanges" className={labelClass}>
                  Requested changes
                </Label>
                <Textarea id="requestedChanges" placeholder="List any changes from the base package..." rows={3} className={textareaClass} value={formData.requestedChanges} onChange={e => updateField("requestedChanges", e.target.value)} />
                
              </div>
            </div>

            <div>
              <Label htmlFor="negotiationNote" className={labelClass}>
                Negotiation note
              </Label>
              <Textarea id="negotiationNote" placeholder="Example: client is serious but price-sensitive. Ask for best net rate before markup." rows={4} className={textareaClass} value={formData.negotiationNote} onChange={e => updateField("negotiationNote", e.target.value)} />
              
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
              <ToggleCard label="Include day-by-day itinerary" active={formData.includeDayByDayItinerary} onChange={value => updateField("includeDayByDayItinerary", value)} />
              
              <ToggleCard label="Include client budget" active={formData.includeClientBudget} onChange={value => updateField("includeClientBudget", value)} />
              
            </div>
          </div>

          {/* Right: Email preview */}
          <div className="xl:sticky xl:top-20 self-start">
            <div className="bg-[#EBF4FF] rounded-[12px] p-5">
              <h3 className="text-sm font-bold text-[#1F2A44] mb-3">
                Supplier email preview
              </h3>

              <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 max-h-[340px] overflow-y-auto text-sm text-gray-700 leading-relaxed mb-4">
                <p>Hi {supplierName},</p>
                <p className="mt-3">
                  We have a client enquiry based on your package.
                </p>
                <p className="mt-3">
                  Could you please quote your best net rate for the below?
                </p>
                <ul className="mt-4 space-y-1.5 list-none">
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Package:</span>{" "}
                    {packageName}
                  </li>
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Destination:</span>{" "}
                    [Destination]
                  </li>
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Travel dates:</span>{" "}
                    {travelDates}
                  </li>
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Travellers:</span>{" "}
                    {adults} adults, {children} children
                    {formData.childrenAges && ` (ages ${formData.childrenAges})`}
                  </li>
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Hotel preference:</span>{" "}
                    {hotelPref}
                  </li>
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Rooming:</span>{" "}
                    {rooming}
                  </li>
                  <li>
                    <span className="font-semibold text-[#1F2A44]">Meal requirement:</span>{" "}
                    {mealReq}
                  </li>
                  {formData.requestedChanges.trim() && <li>
                      <span className="font-semibold text-[#1F2A44]">Requested changes:</span>{" "}
                      {formData.requestedChanges}
                    </li>}
                  {formData.includeDayByDayItinerary && <li>
                      <span className="font-semibold text-[#1F2A44]">Itinerary:</span>{" "}
                      Day-by-day itinerary attached
                    </li>}
                  {formData.includeClientBudget && <li>
                      <span className="font-semibold text-[#1F2A44]">Client budget:</span>{" "}
                      [Budget range]
                    </li>}
                </ul>
                {formData.replyDeadline && <p className="mt-4 text-gray-500">
                    Please reply by{" "}
                    {new Date(formData.replyDeadline).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })}
                    .
                  </p>}
              </div>

              <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 text-sm text-gray-600 space-y-1 mb-4">
                <p>
                  <span className="font-semibold text-[#1F2A44]">Rooming:</span> {rooming}
                </p>
                <p>
                  <span className="font-semibold text-[#1F2A44]">Meal requirement:</span>{" "}
                  {mealReq}
                </p>
                <p>
                  <span className="font-semibold text-[#1F2A44]">Requested changes:</span>{" "}
                  {requestedChangesDisplay}
                </p>
              </div>

              <Button type="button" className="w-full h-12 text-sm font-bold text-white uppercase tracking-wide bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors shadow-sm">
                
                Generate quote request
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-between flex-wrap gap-3 rounded-b-[12px] z-10 mt-6">
        <p className="text-xs text-gray-400">
          ... Incomplete sections stay as draft.
        </p>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
            
            <Icon name="ChevronLeft" size={16} />
            Back
          </Button>

          <Button type="button" onClick={handleSubmit} disabled={isSaving} className={stepSaveButtonClass}>
            
            {saveButtonLabel(isSaving)}
            <span className="text-base leading-none">→</span>
          </Button>
        </div>
      </div>
    </div>;
}
