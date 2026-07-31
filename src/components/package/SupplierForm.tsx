"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "../ui/icons";
import {
  normalizeSupplierFormValues,
  serializeSupplierFormValues,
  supplierFormSchema,
  type SupplierFormValues,
} from "@/lib/validation";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SupplierFormProps extends StepFormBaseProps {
  onNext: (data: SupplierFormValues) => void;
  onPrevious: () => void;
  initialData?: SupplierFormValues & { supplierEmail?: string };
}

const FIELD_HELP: Record<string, string> = {
  supplierName: "Legal or trading name of the DMC, hotel group, or operator supplying this package.",
  supplierPackageName: "The supplier’s own product name for this itinerary or rate.",
  supplierCountry: "Country where the supplier is based or primarily operates.",
  contactPerson: "Primary contact for quotes, confirmations, and follow-ups.",
  supplierEmails: "Add one or more emails for sales, operations, or general enquiries.",
  supplierWhatsapp: "WhatsApp number for quick supplier communication (include country code).",
  quotationUpload: "Attach the supplier quotation, brochure, or rate sheet for internal reference.",
  internalSupplierNotes: "Internal notes only — not shown on the client-facing website.",
};

function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#DBEAFE] text-[#3B82F6] hover:bg-[#BFDBFE] transition-colors"
          aria-label="Field help"
        >
          <Icon name="Info" size={11} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({
  htmlFor,
  helpKey,
  children,
  required,
}: {
  htmlFor?: string;
  helpKey: keyof typeof FIELD_HELP;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-semibold text-[#334155] mb-1.5">
      <span>
        {children}
        {required ? <span className="text-red-400 ml-0.5">*</span> : null}
      </span>
      <FieldHelp text={FIELD_HELP[helpKey]} />
    </Label>
  );
}

const EMAIL_PLACEHOLDERS = [
  "supplier@company.com",
  "sales@company.com",
  "operations@company.com",
];

export default function SupplierForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: SupplierFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: normalizeSupplierFormValues(null),
  });

  const emails = watch("supplierEmails") ?? [""];

  useEffect(() => {
    reset(normalizeSupplierFormValues(initialData ?? null));
  }, [initialData, reset]);

  const handleNext = (data: SupplierFormValues) => {
    onNext(serializeSupplierFormValues(data));
  };

  const addEmail = () => {
    setValue("supplierEmails", [...emails, ""], { shouldDirty: true, shouldValidate: true });
  };

  const removeEmail = (index: number) => {
    if (emails.length <= 1) return;
    setValue(
      "supplierEmails",
      emails.filter((_, i) => i !== index),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const inputClass =
    "w-full h-[42px] px-4 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const textareaClass =
    "w-full min-h-[100px] px-4 py-3 text-sm border border-[#D1D5DB] rounded-[6px] bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 animate-fade-in">
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm">
          <form className="p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1F2A44]">Supplier Source</h2>
                <FieldHelp text="Internal supplier information used by Product and Ops. Not shown to clients." />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Internal only. Capture supplier contact details and attach quotations for the team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="md:col-span-2">
                <FieldLabel htmlFor="supplierName" helpKey="supplierName" required>
                  Supplier name
                </FieldLabel>
                <Input
                  id="supplierName"
                  type="text"
                  placeholder="Example: African Safari Destination Management Company South Af"
                  className={inputClass}
                  {...register("supplierName")}
                />
                {errors.supplierName && <p className={errorClass}>{errors.supplierName.message}</p>}
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="supplierPackageName" helpKey="supplierPackageName" required>
                  Supplier package name
                </FieldLabel>
                <Input
                  id="supplierPackageName"
                  type="text"
                  placeholder="Example: 7D6N Cape Town, Garden Route and Safari Family Experi"
                  className={inputClass}
                  {...register("supplierPackageName")}
                />
                {errors.supplierPackageName && (
                  <p className={errorClass}>{errors.supplierPackageName.message}</p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="supplierCountry" helpKey="supplierCountry">
                  Supplier country
                </FieldLabel>
                <Input
                  id="supplierCountry"
                  type="text"
                  placeholder="South Africa"
                  className={inputClass}
                  {...register("supplierCountry")}
                />
              </div>

              <div>
                <FieldLabel htmlFor="contactPerson" helpKey="contactPerson">
                  Contact person
                </FieldLabel>
                <Input
                  id="contactPerson"
                  type="text"
                  className={inputClass}
                  {...register("contactPerson")}
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel helpKey="supplierEmails">Supplier emails</FieldLabel>
                <div className="space-y-2">
                  {emails.map((_, index) => (
                    <div key={`supplier-email-${index}`} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          id={index === 0 ? "supplierEmails" : `supplierEmails-${index}`}
                          type="email"
                          placeholder={EMAIL_PLACEHOLDERS[index] ?? "another@company.com"}
                          className={inputClass}
                          {...register(`supplierEmails.${index}`)}
                        />
                        {errors.supplierEmails?.[index] && (
                          <p className={errorClass}>
                            {errors.supplierEmails[index]?.message}
                          </p>
                        )}
                      </div>
                      {emails.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeEmail(index)}
                          className="h-[42px] w-[42px] shrink-0 border-[#D1D5DB] text-gray-500 hover:text-red-600 hover:border-red-200"
                          aria-label={`Remove email ${index + 1}`}
                        >
                          <Icon name="Trash2" size={16} />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmail}
                  className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 text-sm border-[#D1D5DB] text-[#334155] hover:bg-gray-50"
                >
                  <Icon name="Plus" size={14} />
                  Add email
                </Button>
              </div>

              <div>
                <FieldLabel htmlFor="supplierWhatsapp" helpKey="supplierWhatsapp">
                  Supplier WhatsApp
                </FieldLabel>
                <Input
                  id="supplierWhatsapp"
                  type="text"
                  placeholder="+65 9123 4567"
                  className={inputClass}
                  {...register("supplierWhatsapp")}
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel helpKey="quotationUpload">
                  Upload supplier quotation, brochure or rate sheet
                </FieldLabel>
                <div className="rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-[6px] hover:bg-[#1F2937] transition-colors"
                  >
                    Choose files
                  </Button>
                  <p className="text-sm text-gray-400 mt-3">
                    Future logic can read this and pre-fill draft fields for human review.
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="internalSupplierNotes" helpKey="internalSupplierNotes">
                  Internal supplier notes
                </FieldLabel>
                <Textarea
                  id="internalSupplierNotes"
                  className={textareaClass}
                  {...register("internalSupplierNotes")}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
            ← Previous
          </Button>

          <p className="text-xs text-gray-400 flex-1 text-center">
            Save as you go. Incomplete sections stay as draft.
          </p>

          <Button
            type="button"
            onClick={handleSubmit(handleNext)}
            disabled={isSaving}
            className={stepSaveButtonClass}
          >
            {saveButtonLabel(isSaving)} →
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
