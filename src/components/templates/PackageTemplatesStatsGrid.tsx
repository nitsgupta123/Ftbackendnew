import { Icon } from "@/components/ui/icons";
import type { PackageTemplatesStats } from "@/lib/package-template-types";

interface PackageTemplatesStatsGridProps {
  stats: PackageTemplatesStats | null;
  loading?: boolean;
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-100" />
      <div className="mt-4 h-7 w-16 bg-gray-100 rounded" />
      <div className="mt-2 h-4 w-24 bg-gray-100 rounded" />
    </div>
  );
}

const STAT_ITEMS = [
  {
    key: "total" as const,
    label: "Total Templates",
    icon: "FileSpreadsheet",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: "CheckCircle",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    key: "full" as const,
    label: "Full Skeletons",
    icon: "FileStack",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    key: "partial" as const,
    label: "Partial",
    icon: "List",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

export default function PackageTemplatesStatsGrid({
  stats,
  loading = false,
}: PackageTemplatesStatsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {STAT_ITEMS.map((item) => (
          <StatSkeleton key={item.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {STAT_ITEMS.map((item) => (
        <div
          key={item.key}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className={`w-12 h-12 rounded-full ${item.iconBg} flex items-center justify-center`}>
            <Icon name={item.icon} size={22} className={item.iconColor} />
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900 leading-none">
            {(stats?.[item.key] ?? 0).toLocaleString()}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
