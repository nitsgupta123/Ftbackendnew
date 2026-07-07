"use client";

import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "../ui/icons";
import { supplierFormSchema, type SupplierFormValues } from "@/lib/validation";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
interface SupplierFormProps extends StepFormBaseProps {
  onNext: (data: SupplierFormValues) => void;
  onPrevious: () => void;
  initialData?: SupplierFormValues;
}
type DateFieldName = "validityFrom" | "validityTo" | "supplierBookingDeadline";
function formatIsoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}
function DateField({
  id,
  control
}: {
  id: DateFieldName;
  control: ReturnType<typeof useForm<SupplierFormValues>>["control"];
}) {
  return <Controller name={id} control={control} render={({
    field
  }) => {
    const isoValue = field.value && /^\d{4}-\d{2}-\d{2}$/.test(field.value) ? field.value : "";
    const displayValue = formatIsoToDisplay(isoValue);
    return <div className="relative h-[42px]">
            <Input type="text" readOnly tabIndex={-1} placeholder="dd-mm-yyyy" value={displayValue} className="absolute inset-0 w-full h-full px-4 pr-10 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 pointer-events-none" />
            
            <Input id={id} type="date" value={isoValue} onChange={e => field.onChange(e.target.value)} onBlur={field.onBlur} name={field.name} ref={field.ref} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
            
            <Icon name="Calendar" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            
          </div>;
  }} />;
}
export default function SupplierForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false
}: SupplierFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {
      errors
    }
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      supplierName: "",
      supplierPackageName: "",
      supplierCountry: "",
      supplierCurrency: "SGD",
      contactPerson: "",
      supplierEmail: "",
      supplierWhatsapp: "",
      supplierQuotedNetPrice: "",
      validityFrom: "",
      validityTo: "",
      supplierBookingDeadline: "",
      paymentTerms: "",
      cancellationTerms: "",
      internalSupplierNotes: ""
    }
  });
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);
  const handleNext = (data: SupplierFormValues) => {
    onNext(data);
  };
  const inputClass = "w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const textareaClass = "w-full min-h-[100px] px-4 py-3 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const labelClass = "block text-sm font-semibold text-[#334155] mb-1.5";
  const requiredStar = <span className="text-red-400 ml-0.5">*</span>;
  const errorClass = "text-xs text-red-500 mt-1";
  return <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm">
        <form className="p-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#1F2A44]">Supplier Source</h2>
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6]" title="Internal supplier information">
                
              <Icon name="Info" size={11} />
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Internal only. Long supplier names and package names use wider fields
            so the team can actually read what they are entering.
          </p>
        </div>

        {/* Info callout */}
        <div className="mb-6 flex items-start gap-2.5 p-4 rounded-[8px] bg-[#EFF6FF] border border-[#BFDBFE]">
          <Icon name="Info" size={16} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
            
          <p className="text-sm text-[#1E40AF] leading-relaxed">
            Validity to means the supplier rate is usable until that date.
            Supplier booking deadline means the last date we can confirm space
            or make payment with the supplier. Sometimes these are the same, but
            the booking deadline is often earlier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Supplier name * */}
          <div className="md:col-span-2">
            <Label htmlFor="supplierName" className={labelClass}>
              Supplier name {requiredStar}
            </Label>
            <Input id="supplierName" type="text" placeholder="Example: African Safari Destination Management Company South Af" className={inputClass} {...register("supplierName")} />
              
            {errors.supplierName && <p className={errorClass}>{errors.supplierName.message}</p>}
          </div>

          {/* Supplier package name * */}
          <div className="md:col-span-2">
            <Label htmlFor="supplierPackageName" className={labelClass}>
              Supplier package name {requiredStar}
            </Label>
            <Input id="supplierPackageName" type="text" placeholder="Example: 7D6N Cape Town, Garden Route and Safari Family Experi" className={inputClass} {...register("supplierPackageName")} />
              
            {errors.supplierPackageName && <p className={errorClass}>
                {errors.supplierPackageName.message}
              </p>}
          </div>

          {/* Supplier country */}
          <div>
            <Label htmlFor="supplierCountry" className={labelClass}>
              Supplier country
            </Label>
            <Input id="supplierCountry" type="text" placeholder="South Africa" className={inputClass} {...register("supplierCountry")} />
              
          </div>

          {/* Supplier currency */}
          <div>
            <Label htmlFor="supplierCurrency" className={labelClass}>
              Supplier currency
            </Label>
            <NativeSelect id="supplierCurrency" className={inputClass} {...register("supplierCurrency")}>
                
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="THB">THB — Thai Baht</option>
              <option value="IDR">IDR — Indonesian Rupiah</option>
              <option value="MYR">MYR — Malaysian Ringgit</option>
              <option value="SGD">SGD — Singapore Dollar</option>
              <option value="INR">INR — Indian Rupee</option>
            </NativeSelect>
          </div>

          {/* Contact person */}
          <div>
            <Label htmlFor="contactPerson" className={labelClass}>
              Contact person
            </Label>
            <Input id="contactPerson" type="text" className={inputClass} {...register("contactPerson")} />
              
          </div>

          {/* Supplier email */}
          <div>
            <Label htmlFor="supplierEmail" className={labelClass}>
              Supplier email
            </Label>
            <Input id="supplierEmail" type="email" className={inputClass} {...register("supplierEmail")} />
              
            {errors.supplierEmail && <p className={errorClass}>{errors.supplierEmail.message}</p>}
          </div>

          {/* Supplier WhatsApp */}
          <div>
            <Label htmlFor="supplierWhatsapp" className={labelClass}>
              Supplier WhatsApp
            </Label>
            <Input id="supplierWhatsapp" type="text" className={inputClass} {...register("supplierWhatsapp")} />
              
          </div>

          {/* Supplier quoted net price */}
          <div>
            <Label htmlFor="supplierQuotedNetPrice" className={labelClass}>
              Supplier quoted net price
            </Label>
            <Input id="supplierQuotedNetPrice" type="text" className={inputClass} {...register("supplierQuotedNetPrice")} />
              
          </div>

          {/* Validity from */}
          <div>
            <Label htmlFor="validityFrom" className={labelClass}>
              Validity from
            </Label>
            <DateField id="validityFrom" control={control} />
          </div>

          {/* Validity to */}
          <div>
            <Label htmlFor="validityTo" className={labelClass}>
              Validity to
            </Label>
            <DateField id="validityTo" control={control} />
          </div>

          {/* Supplier booking deadline */}
          <div>
            <Label htmlFor="supplierBookingDeadline" className={labelClass}>
              Supplier booking deadline
            </Label>
            <DateField id="supplierBookingDeadline" control={control} />
          </div>

          {/* File upload */}
          <div className="md:col-span-2">
            <Label className={labelClass}>
              Upload supplier quotation, brochure or rate sheet
            </Label>
            <div className="rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <Input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                
              <Button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-[6px] hover:bg-[#1F2937] transition-colors">
                  
                Choose files
              </Button>
              <p className="text-sm text-gray-400 mt-3">
                Future logic can read this and pre-fill draft fields for human
                review.
              </p>
            </div>
          </div>

          {/* Payment terms */}
          <div>
            <Label htmlFor="paymentTerms" className={labelClass}>
              Payment terms
            </Label>
            <Textarea id="paymentTerms" className={textareaClass} {...register("paymentTerms")} />
              
          </div>

          {/* Cancellation terms */}
          <div>
            <Label htmlFor="cancellationTerms" className={labelClass}>
              Cancellation terms
            </Label>
            <Textarea id="cancellationTerms" className={textareaClass} {...register("cancellationTerms")} />
              
          </div>

          {/* Internal supplier notes */}
          <div className="md:col-span-2">
            <Label htmlFor="internalSupplierNotes" className={labelClass}>
              Internal supplier notes
            </Label>
            <Textarea id="internalSupplierNotes" className={textareaClass} {...register("internalSupplierNotes")} />
              
          </div>
        </div>
      </form>
      </div>

      {/* Bottom action footer */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          
          ← Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Save as you go. Incomplete sections stay as draft.
        </p>

        <Button type="button" onClick={handleSubmit(handleNext)} disabled={isSaving} className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)} →
        </Button>
      </div>
    </div>;
}
