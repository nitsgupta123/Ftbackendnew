import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createSupplierSchema,
  type CreateSupplierFormValues,
} from "@/lib/validation";
import {
  SUPPLIER_RELATIONSHIP_OPTIONS,
  SUPPLIER_STATUS_OPTIONS,
  type SupplierRecord,
} from "@/lib/supplier-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import ServiceOfferedSelect from "@/components/suppliers/ServiceOfferedSelect";
import { toDateOnlySgt } from "@/lib/format-date";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass =
  "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";

interface SupplierFormProps {
  initialData?: SupplierRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreateSupplierFormValues) => Promise<void>;
  onCancel: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="block text-sm font-semibold text-[#334155] mb-1.5">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </Label>
  );
}

function todayIsoDate() {
  return toDateOnlySgt(new Date()) ?? "";
}

function toInputDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return toDateOnlySgt(value) ?? "";
}

function resolveDateAddedUpdated(supplier?: SupplierRecord | null): string {
  if (!supplier) return todayIsoDate();
  return (
    toInputDate(supplier.date_added_updated) ||
    toInputDate(supplier.updated_at) ||
    toInputDate(supplier.created_at) ||
    todayIsoDate()
  );
}

export default function SupplierForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: SupplierFormProps) {
  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      date_added_updated: resolveDateAddedUpdated(initialData),
      country: initialData?.country ?? "",
      status: initialData?.status ?? "active",
      city_tour_area: initialData?.city_tour_area ?? "",
      relationship_status: initialData?.relationship_status ?? "new",
      company_name: initialData?.company_name ?? "",
      services_offered: initialData?.services_offered ?? "",
      contact_person: initialData?.contact_person ?? "",
      email_address: initialData?.email_address ?? "",
      contact_number: initialData?.contact_number ?? "",
      website: initialData?.website ?? "",
      notes: initialData?.notes ?? "",
      problems_with_services: initialData?.problems_with_services ?? "",
      account_details: initialData?.account_details ?? "",
      tc_poc_fixed_departure: initialData?.tc_poc_fixed_departure ?? "",
      relationship_owner: initialData?.relationship_owner ?? "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        date_added_updated: resolveDateAddedUpdated(initialData),
        country: initialData.country,
        status: initialData.status,
        city_tour_area: initialData.city_tour_area ?? "",
        relationship_status: initialData.relationship_status,
        company_name: initialData.company_name,
        services_offered: initialData.services_offered ?? "",
        contact_person: initialData.contact_person ?? "",
        email_address: initialData.email_address ?? "",
        contact_number: initialData.contact_number ?? "",
        website: initialData.website ?? "",
        notes: initialData.notes ?? "",
        problems_with_services: initialData.problems_with_services ?? "",
        account_details: initialData.account_details ?? "",
        tc_poc_fixed_departure: initialData.tc_poc_fixed_departure ?? "",
        relationship_owner: initialData.relationship_owner ?? "",
      });
    } else {
      reset({
        date_added_updated: todayIsoDate(),
        country: "",
        status: "active",
        city_tour_area: "",
        relationship_status: "new",
        company_name: "",
        services_offered: "",
        contact_person: "",
        email_address: "",
        contact_number: "",
        website: "",
        notes: "",
        problems_with_services: "",
        account_details: "",
        tc_poc_fixed_departure: "",
        relationship_owner: "",
      });
    }
  }, [initialData, reset]);

  const servicesOffered = watch("services_offered") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-xl border border-[#0B3A5C]/15 bg-[#F3F7FA] px-4 py-3">
        <p className="text-sm font-semibold text-[#0B3A5C]">
          Fill all supplier details (same columns as the Vendor/Supplier sheet)
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Summary is generated automatically from the fields below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="date_added_updated">Date Added/Updated</FieldLabel>
          <Input
            id="date_added_updated"
            type="date"
            className={inputClass}
            {...register("date_added_updated")}
          />
          <p className="mt-1 text-xs text-gray-400">
            Shown from the record — change it anytime and save.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="country" required>
            Country
          </FieldLabel>
          <Input
            id="country"
            className={inputClass}
            {...register("country")}
            placeholder="e.g. Australia"
          />
          <FieldError message={errors.country?.message} />
        </div>

        <div>
          <FieldLabel htmlFor="status">Active Status</FieldLabel>
          <NativeSelect id="status" className={inputClass} {...register("status")}>
            {SUPPLIER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div>
          <FieldLabel htmlFor="city_tour_area">City / Tour Area</FieldLabel>
          <Input
            id="city_tour_area"
            className={inputClass}
            {...register("city_tour_area")}
            placeholder="e.g. Melbourne, Sydney"
          />
        </div>

        <div>
          <FieldLabel htmlFor="relationship_status">Relationship Status</FieldLabel>
          <NativeSelect
            id="relationship_status"
            className={inputClass}
            {...register("relationship_status")}
          >
            {SUPPLIER_RELATIONSHIP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div>
          <FieldLabel htmlFor="company_name" required>
            Company Name
          </FieldLabel>
          <Input
            id="company_name"
            className={inputClass}
            {...register("company_name")}
            placeholder="e.g. Pure Travel Group"
          />
          <FieldError message={errors.company_name?.message} />
        </div>

        <div className="md:col-span-2">
          <ServiceOfferedSelect
            id="services_offered"
            value={servicesOffered}
            onChange={(next) =>
              setValue("services_offered", next, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            placeholder="Select services…"
          />
        </div>

        <div>
          <FieldLabel htmlFor="contact_person">Point of Contact Name</FieldLabel>
          <Input
            id="contact_person"
            className={inputClass}
            {...register("contact_person")}
            placeholder="Contact name(s)"
          />
        </div>

        <div>
          <FieldLabel htmlFor="website">Website</FieldLabel>
          <Input
            id="website"
            className={inputClass}
            {...register("website")}
            placeholder="www.example.com"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="email_address">Email Address</FieldLabel>
          <Textarea
            id="email_address"
            className={textareaClass}
            {...register("email_address")}
            placeholder="One email per line, or comma-separated"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="contact_number">Contact Number</FieldLabel>
          <Textarea
            id="contact_number"
            className={textareaClass}
            {...register("contact_number")}
            placeholder="Phone / WhatsApp numbers"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            className={textareaClass}
            {...register("notes")}
            placeholder="Internal notes about this supplier"
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="problems_with_services">Problems with Services</FieldLabel>
          <Textarea
            id="problems_with_services"
            className={textareaClass}
            {...register("problems_with_services")}
            placeholder="Known issues, SLA problems, etc."
            rows={3}
          />
        </div>

        <div>
          <FieldLabel htmlFor="account_details">
            Account details Local Currency /
          </FieldLabel>
          <Textarea
            id="account_details"
            className={textareaClass}
            {...register("account_details")}
            placeholder="Bank / payment / currency notes"
            rows={3}
          />
        </div>

        <div>
          <FieldLabel htmlFor="tc_poc_fixed_departure">
            TC POC for the Fixed Departure Package
          </FieldLabel>
          <Input
            id="tc_poc_fixed_departure"
            className={inputClass}
            {...register("tc_poc_fixed_departure")}
            placeholder="Travel consultant POC"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="relationship_owner">Relationship Owner</FieldLabel>
          <Input
            id="relationship_owner"
            className={inputClass}
            {...register("relationship_owner")}
            placeholder="e.g. Miko, Muhammad, Namrata"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E8ECF0]">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-10 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="h-10 px-5 rounded-lg bg-[#A68231] text-sm font-semibold text-white hover:bg-[#A68231]/90 disabled:opacity-60"
        >
          {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Add Supplier"}
        </Button>
      </div>
    </form>
  );
}
