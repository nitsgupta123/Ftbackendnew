import { Icon } from "@/components/ui/icons";
import type { AdminUserStats } from "@/lib/user-types";

const GOLD = "#A68231";

interface UserStatsGridProps {
  stats: AdminUserStats | null;
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
        <p className="text-xl font-semibold text-[#1F2A44] leading-tight">{value}</p>
      </div>
    </div>
  );
}

const STAT_ITEMS = [
  {
    key: "total" as const,
    label: "Total Users",
    icon: "Users",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: "CheckCircle",
    accent: "#27AE60",
  },
  {
    key: "superAdmins" as const,
    label: "Super Admins",
    icon: "Shield",
  },
];

export default function UserStatsGrid({ stats, loading = false }: UserStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {STAT_ITEMS.map((item) => (
        <StatCard
          key={item.key}
          label={item.label}
          value={loading ? "—" : (stats?.[item.key] ?? 0).toLocaleString()}
          icon={item.icon}
          accent={item.accent}
        />
      ))}
    </div>
  );
}
