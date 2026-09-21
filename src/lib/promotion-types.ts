import { nowIsoSgt } from "./format-date";

export type PromotionDiscountType = "percentage" | "fixed_amount";
export type PromotionStatus = "active" | "inactive";

export interface PromotionRecord {
  id: number;
  title: string;
  valid_from: string | null;
  valid_to: string | null;
  discount_type: PromotionDiscountType;
  value: number;
  package_keys: string[];
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
}

export interface PromotionPackageOption {
  key: string;
  label: string;
}

export function packageOptionKey(source: "wizard" | "legacy" | undefined, id: number): string {
  return `${source ?? "wizard"}:${id}`;
}

export const DISCOUNT_TYPE_OPTIONS: { value: PromotionDiscountType; label: string }[] = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" },
];

const SAMPLE_NOW = nowIsoSgt();

export const SAMPLE_PROMOTIONS: PromotionRecord[] = [
  {
    id: 1,
    title: "Global Price Offer",
    valid_from: null,
    valid_to: null,
    discount_type: "percentage",
    value: 15,
    package_keys: ["wizard:1"],
    status: "active",
    created_at: SAMPLE_NOW,
    updated_at: SAMPLE_NOW,
  },
];
