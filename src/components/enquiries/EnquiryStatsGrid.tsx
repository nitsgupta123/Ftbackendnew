import { Icon } from "@/components/ui/icons";
import type { EnquiryStats } from "@/lib/enquiry-types";

const GOLD = "#A68231";

interface EnquiryStatsGridProps {
  stats: EnquiryStats | null;
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
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-xl font-semibold text-[#1F2A44] leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function EnquiryStatsGrid({
  stats,
  loading = false,
}: EnquiryStatsGridProps) {
  const busy = loading || !stats;
  const value = (n: number) => (busy ? "—" : n.toLocaleString());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label="Total Enquiries"
        value={value(stats?.total ?? 0)}
        icon="MessageSquare"
      />
      <StatCard
        label="Open"
        value={value(stats?.open ?? 0)}
        icon="Clock"
        accent="#D97706"
      />
      <StatCard
        label="Closed"
        value={value(stats?.closed ?? 0)}
        icon="CheckCircle"
        accent="#27AE60"
      />
    </div>
  );
}
