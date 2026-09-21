import { Link } from "react-router-dom";

import { Icon } from "@/components/ui/icons";
import type { QuickActionItem } from "@/lib/dashboard-data";

interface QuickActionsProps {
  actions: QuickActionItem[];
}

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm h-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>

      <ul className="space-y-1">
        {actions.map((action) => (
          <li key={action.label}>
            <Link
              to={action.href}
              className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div
                className={`w-8 h-8 rounded-lg ${action.iconBg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon name={action.icon} size={15} className={action.iconColor} />
              </div>
              <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                {action.label}
              </span>
              <Icon
                name="ChevronRight"
                size={16}
                className="text-gray-300 group-hover:text-gray-500 transition-colors"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
