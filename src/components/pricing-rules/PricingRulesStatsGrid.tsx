import { Icon } from "@/components/ui/icons";
import type { PricingRulesStats } from "@/lib/pricing-rules-types";

const GOLD = "#A68231";

interface PricingRulesStatsGridProps {
  stats: PricingRulesStats | null;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: accent ? `${accent}14` : `${GOLD}14`,
          color: accent ?? GOLD,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-[#1F2A44] leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

export default function PricingRulesStatsGrid({
  stats,
  loading = false,
}: PricingRulesStatsGridProps) {
  const busy = loading;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <StatCard
        label="Total Rules"
        value={busy ? "—" : (stats?.total ?? 0)}
        icon="FileText"
      />
      <StatCard
        label="Active"
        value={busy ? "—" : (stats?.active ?? 0)}
        icon="CheckCircle"
        accent="#27AE60"
      />
      <StatCard
        label="Default Rule"
        value={busy ? "—" : (stats?.default_rule?.name ?? "—")}
        icon="Star"
      />
    </div>
  );
}
