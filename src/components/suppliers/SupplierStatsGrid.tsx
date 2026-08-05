import { Icon } from "@/components/ui/icons";
import type { SuppliersStats } from "@/lib/supplier-types";

const GOLD = "#A68231";

interface SupplierStatsGridProps {
  stats: SuppliersStats | null;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
  hint?: string;
}) {
  const color = accent ?? GOLD;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#E8ECF0] bg-white px-4 py-4 shadow-sm transition hover:border-[#D6DEE8] hover:shadow-md">
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="flex items-start gap-3 pl-1.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-[1.03]"
          style={{
            backgroundColor: `${color}14`,
            color,
          }}
        >
          <Icon name={icon} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none tracking-tight text-[#1F2A44]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 truncate text-xs text-gray-400">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SupplierStatsGrid({
  stats,
  loading = false,
}: SupplierStatsGridProps) {
  const busy = loading;
  const format = (n: number) => (busy ? "—" : n.toLocaleString());

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Total Suppliers"
        value={format(stats?.total ?? 0)}
        icon="Users"
        hint="All vendors on record"
      />
      <StatCard
        label="Active"
        value={format(stats?.active ?? 0)}
        icon="CheckCircle"
        accent="#27AE60"
        hint="Ready to book"
      />
      <StatCard
        label="Inactive"
        value={format(stats?.inactive ?? 0)}
        icon="XCircle"
        accent="#64748B"
        hint="Not currently in use"
      />
      <StatCard
        label="With Issues"
        value={format(stats?.with_issues ?? 0)}
        icon="AlertCircle"
        accent="#DC2626"
        hint="Needs attention"
      />
      <StatCard
        label="Countries"
        value={format(stats?.countries ?? 0)}
        icon="Globe"
        hint="Geographic coverage"
      />
    </div>
  );
}
