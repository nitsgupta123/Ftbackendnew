import { Icon } from "@/components/ui/icons";

interface SummaryItem {
  label: string;
  value: number;
  icon: string;
  iconColor: string;
}

interface ContentSummaryProps {
  items: SummaryItem[];
  loading?: boolean;
}

export default function ContentSummary({ items, loading = false }: ContentSummaryProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Content Summary</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {(loading && !items.length ? Array.from({ length: 6 }, (_, index) => ({
          label: "Loading",
          value: 0,
          icon: "LayoutDashboard",
          iconColor: "text-gray-300",
          key: `summary-${index}`,
        })) : items).map((item, index) => (
          <div
            key={"key" in item ? item.key : item.label}
            className="flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB] hover:bg-gray-100 transition-colors"
          >
            <Icon name={item.icon} size={20} className={item.iconColor} />
            <div>
              <p className="text-lg font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
