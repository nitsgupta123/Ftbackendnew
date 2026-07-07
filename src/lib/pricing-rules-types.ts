export type PricingRuleStatus = "active" | "inactive";

export type PricingRuleScopeType = "global" | "destination" | "currency" | "supplier_country";

export type ExchangeRateType = "manual" | "auto" | "fixed";

export type MarkupType = "percentage" | "fixed" | "tiered";

export interface TieredMarkupBand {
  min_pax?: number;
  max_pax?: number;
  markup_value: string;
}

export interface PricingRuleRecord {
  id: number;
  name: string;
  description: string | null;
  scope_type: PricingRuleScopeType;
  scope_value: string | null;
  supplier_currency: string | null;
  display_currency: string | null;
  exchange_rate_type: ExchangeRateType;
  default_exchange_rate: number | null;
  rate_lock_days: number | null;
  markup_type: MarkupType;
  default_markup_value: string | null;
  tiered_markup_json: TieredMarkupBand[] | null;
  minimum_margin_percent: number | null;
  finance_approval_threshold: number | null;
  requires_finance_approval: boolean;
  status: PricingRuleStatus;
  is_default: boolean;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePricingRuleInput {
  name: string;
  description?: string | null;
  scope_type?: PricingRuleScopeType;
  scope_value?: string | null;
  supplier_currency?: string | null;
  display_currency?: string | null;
  exchange_rate_type?: ExchangeRateType;
  default_exchange_rate?: number | null;
  rate_lock_days?: number | null;
  markup_type?: MarkupType;
  default_markup_value?: string | null;
  tiered_markup_json?: TieredMarkupBand[] | null;
  minimum_margin_percent?: number | null;
  finance_approval_threshold?: number | null;
  requires_finance_approval?: boolean;
  status?: PricingRuleStatus;
  is_default?: boolean;
  display_order?: number;
}

export interface UpdatePricingRuleInput {
  name?: string;
  description?: string | null;
  scope_type?: PricingRuleScopeType;
  scope_value?: string | null;
  supplier_currency?: string | null;
  display_currency?: string | null;
  exchange_rate_type?: ExchangeRateType;
  default_exchange_rate?: number | null;
  rate_lock_days?: number | null;
  markup_type?: MarkupType;
  default_markup_value?: string | null;
  tiered_markup_json?: TieredMarkupBand[] | null;
  minimum_margin_percent?: number | null;
  finance_approval_threshold?: number | null;
  requires_finance_approval?: boolean;
  status?: PricingRuleStatus;
  is_default?: boolean;
  display_order?: number;
}

export interface ListPricingRulesParams {
  search?: string;
  status?: PricingRuleStatus | "all";
  scope_type?: PricingRuleScopeType | "all";
  sort?: "display_order" | "created_at" | "name";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface ListPricingRulesResult {
  rules: PricingRuleRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PricingRulesStats {
  total: number;
  active: number;
  inactive: number;
  default_rule: PricingRuleRecord | null;
}

export const PRICING_RULE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type PricingRuleStatusFilter =
  (typeof PRICING_RULE_STATUS_FILTER_OPTIONS)[number]["value"];

export const PRICING_RULE_SCOPE_FILTER_OPTIONS = [
  { value: "all", label: "All scopes" },
  { value: "global", label: "Global" },
  { value: "destination", label: "Destination" },
  { value: "currency", label: "Currency" },
  { value: "supplier_country", label: "Supplier country" },
] as const;

export type PricingRuleScopeFilter =
  (typeof PRICING_RULE_SCOPE_FILTER_OPTIONS)[number]["value"];

export const PRICING_RULE_SORT_OPTIONS = [
  { value: "display_order", label: "Display order" },
  { value: "name", label: "Name" },
  { value: "created_at", label: "Created date" },
] as const;

export const EXCHANGE_RATE_TYPE_OPTIONS = [
  { value: "manual", label: "Manual entry" },
  { value: "auto", label: "Auto (live rate)" },
  { value: "fixed", label: "Fixed rate" },
] as const;

export const MARKUP_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage markup" },
  { value: "fixed", label: "Fixed amount" },
  { value: "tiered", label: "Tiered markup" },
] as const;

export const SCOPE_TYPE_OPTIONS = [
  { value: "global", label: "Global (all packages)" },
  { value: "destination", label: "By destination" },
  { value: "currency", label: "By currency pair" },
  { value: "supplier_country", label: "By supplier country" },
] as const;
