"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/icons";
import {
  createPricingRuleSchema,
  type CreatePricingRuleFormValues,
} from "@/lib/validation";
import {
  EXCHANGE_RATE_TYPE_OPTIONS,
  MARKUP_TYPE_OPTIONS,
  SCOPE_TYPE_OPTIONS,
  type PricingRuleRecord,
} from "@/lib/pricing-rules-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";
const textareaClass =
  "w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C] resize-y min-h-[88px]";

interface PricingRuleFormProps {
  initialData?: PricingRuleRecord | null;
  isSaving?: boolean;
  onSubmit: (data: CreatePricingRuleFormValues) => Promise<void>;
  onCancel: () => void;
}

function ToggleSwitch({
  label,
  subtext,
  enabled,
  onChange,
}: {
  label: string;
  subtext?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3">
      <div>
        <span className="text-sm font-medium text-[#334155]">{label}</span>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
      <Button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? "bg-[#27AE60]" : "bg-[#CBD5E1]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </Button>
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

export default function PricingRuleForm({
  initialData,
  isSaving = false,
  onSubmit,
  onCancel,
}: PricingRuleFormProps) {
  const isEdit = Boolean(initialData);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreatePricingRuleFormValues>({
    resolver: zodResolver(createPricingRuleSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      scope_type: initialData?.scope_type ?? "global",
      scope_value: initialData?.scope_value ?? "",
      supplier_currency: initialData?.supplier_currency ?? "",
      display_currency: initialData?.display_currency ?? "",
      exchange_rate_type: initialData?.exchange_rate_type ?? "manual",
      default_exchange_rate: initialData?.default_exchange_rate ?? undefined,
      rate_lock_days: initialData?.rate_lock_days ?? undefined,
      markup_type: initialData?.markup_type ?? "percentage",
      default_markup_value: initialData?.default_markup_value ?? "",
      minimum_margin_percent: initialData?.minimum_margin_percent ?? undefined,
      finance_approval_threshold: initialData?.finance_approval_threshold ?? undefined,
      requires_finance_approval: initialData?.requires_finance_approval ?? true,
      status: initialData?.status ?? "active",
      is_default: initialData?.is_default ?? false,
      display_order: initialData?.display_order ?? 0,
    },
  });

  const scopeType = useWatch({ control, name: "scope_type" });
  const markupType = useWatch({ control, name: "markup_type" });
  const exchangeRateType = useWatch({ control, name: "exchange_rate_type" });
  const requiresFinance = useWatch({ control, name: "requires_finance_approval" });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description ?? "",
        scope_type: initialData.scope_type,
        scope_value: initialData.scope_value ?? "",
        supplier_currency: initialData.supplier_currency ?? "",
        display_currency: initialData.display_currency ?? "",
        exchange_rate_type: initialData.exchange_rate_type,
        default_exchange_rate: initialData.default_exchange_rate ?? undefined,
        rate_lock_days: initialData.rate_lock_days ?? undefined,
        markup_type: initialData.markup_type,
        default_markup_value: initialData.default_markup_value ?? "",
        minimum_margin_percent: initialData.minimum_margin_percent ?? undefined,
        finance_approval_threshold: initialData.finance_approval_threshold ?? undefined,
        requires_finance_approval: initialData.requires_finance_approval,
        status: initialData.status,
        is_default: initialData.is_default,
        display_order: initialData.display_order,
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-[#F5E6C8] bg-[#FFF9EB] px-4 py-3 flex flex-wrap gap-2">
        <PillTag label="Exchange rate" />
        <PillTag label="Markup" />
        <PillTag label="Finance approval" />
        <PillTag label="Margin alerts" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Rule Name <span className="text-red-500">*</span>
          </Label>
          <Input id="name" className={inputClass} {...register("name")} placeholder="Default Global Rule" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description" className="block text-sm font-semibold text-[#334155] mb-1.5">
            Description
          </Label>
          <Textarea
            id="description"
            className={textareaClass}
            {...register("description")}
            placeholder="When this rule applies and any notes for Product or Finance."
          />
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] pt-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Scope</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="scope_type" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Applies to
            </Label>
            <NativeSelect id="scope_type" className={inputClass} {...register("scope_type")}>
              {SCOPE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {scopeType !== "global" && (
            <div>
              <Label htmlFor="scope_value" className="block text-sm font-semibold text-[#334155] mb-1.5">
                Scope value
              </Label>
              <Input
                id="scope_value"
                className={inputClass}
                {...register("scope_value")}
                placeholder={
                  scopeType === "destination"
                    ? "e.g. UAE"
                    : scopeType === "currency"
                      ? "e.g. ZAR/SGD"
                      : "e.g. South Africa"
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] pt-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Exchange Rate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="supplier_currency" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Supplier currency
            </Label>
            <Input id="supplier_currency" className={inputClass} {...register("supplier_currency")} placeholder="ZAR" />
          </div>
          <div>
            <Label htmlFor="display_currency" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Display currency
            </Label>
            <Input id="display_currency" className={inputClass} {...register("display_currency")} placeholder="SGD" />
          </div>
          <div>
            <Label htmlFor="exchange_rate_type" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Rate type
            </Label>
            <NativeSelect id="exchange_rate_type" className={inputClass} {...register("exchange_rate_type")}>
              {EXCHANGE_RATE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {exchangeRateType !== "auto" && (
            <div>
              <Label htmlFor="default_exchange_rate" className="block text-sm font-semibold text-[#334155] mb-1.5">
                Default exchange rate
              </Label>
              <Input
                id="default_exchange_rate"
                type="number"
                step="any"
                min="0"
                className={inputClass}
                {...register("default_exchange_rate", { valueAsNumber: true })}
                placeholder="0.0725"
              />
            </div>
          )}
          <div>
            <Label htmlFor="rate_lock_days" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Rate lock (days)
            </Label>
            <Input
              id="rate_lock_days"
              type="number"
              min="0"
              className={inputClass}
              {...register("rate_lock_days", { valueAsNumber: true })}
              placeholder="30"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] pt-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Markup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="markup_type" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Markup type
            </Label>
            <NativeSelect id="markup_type" className={inputClass} {...register("markup_type")}>
              {MARKUP_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {markupType !== "tiered" && (
            <div>
              <Label htmlFor="default_markup_value" className="block text-sm font-semibold text-[#334155] mb-1.5">
                Markup value
              </Label>
              <Input
                id="default_markup_value"
                className={inputClass}
                {...register("default_markup_value")}
                placeholder={markupType === "percentage" ? "18" : "500"}
              />
            </div>
          )}
          <div>
            <Label htmlFor="minimum_margin_percent" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Minimum margin alert (%)
            </Label>
            <Input
              id="minimum_margin_percent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={inputClass}
              {...register("minimum_margin_percent", { valueAsNumber: true })}
              placeholder="12"
            />
          </div>
        </div>
        {markupType === "tiered" && (
          <p className="mt-2 text-xs text-gray-400">
            Tiered markup bands can be configured in a future update. Use percentage or fixed for now.
          </p>
        )}
      </div>

      <div className="border-t border-[#E5E7EB] pt-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Finance Approval</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="requires_finance_approval"
            render={({ field }) => (
              <ToggleSwitch
                label="Require finance approval"
                subtext="When margin falls below threshold, package needs Finance sign-off."
                enabled={field.value ?? true}
                onChange={field.onChange}
              />
            )}
          />
          {requiresFinance && (
            <div>
              <Label
                htmlFor="finance_approval_threshold"
                className="block text-sm font-semibold text-[#334155] mb-1.5"
              >
                Approval threshold (% margin)
              </Label>
              <Input
                id="finance_approval_threshold"
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={inputClass}
                {...register("finance_approval_threshold", { valueAsNumber: true })}
                placeholder="10"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] pt-5">
        <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="display_order" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Display order
            </Label>
            <Input
              id="display_order"
              type="number"
              min="0"
              className={inputClass}
              {...register("display_order", { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label htmlFor="status" className="block text-sm font-semibold text-[#334155] mb-1.5">
              Status
            </Label>
            <NativeSelect id="status" className={inputClass} {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
          </div>
          <Controller
            control={control}
            name="is_default"
            render={({ field }) => (
              <ToggleSwitch
                label="Default rule"
                subtext="Used as fallback when no scoped rule matches."
                enabled={field.value ?? false}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="h-11 px-5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 px-5 items-center gap-2 text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 disabled:opacity-50"
        >
          {isSaving && <Icon name="Loader2" size={16} className="animate-spin" />}
          {isSaving ? "Saving…" : isEdit ? "Update Rule" : "Create Rule"}
        </Button>
      </div>
    </form>
  );
}
