import { Icon } from "@/components/ui/icons";
import type { StatCardData } from "@/lib/dashboard-data";

export default function StatCard({ label, value, change, icon, iconBg, iconColor }: StatCardData) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="w-full min-h-[120px] rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:min-h-[140px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon name={icon} size={24} className={iconColor} />
        </div>
        {!isNeutral && (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
        )}
        {isNeutral && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
            0%
          </span>
        )}
      </div>
      <p className="mt-4 text-xl font-extrabold text-gray-900 leading-none">{value.toLocaleString()}</p>
      <p className="mt-2 text-sm font-bold text-gray-600">{label}</p>
      <p className="mt-1.5 text-xs font-semibold text-gray-400">vs last month</p>
    </div>
  );
}
