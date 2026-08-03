"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { ActivityItem } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";

const STATUS_STYLES = {
  Published: "bg-emerald-50 text-emerald-600",
  Draft: "bg-gray-100 text-gray-600",
  Pending: "bg-amber-50 text-amber-600",
};

const PREVIEW_COUNT = 5;

interface RecentActivitiesProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export default function RecentActivities({ activities, loading = false }: RecentActivitiesProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = activities.length > PREVIEW_COUNT;
  const visibleActivities = expanded ? activities : activities.slice(0, PREVIEW_COUNT);

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Activities</h3>
        {canExpand && (
          <Button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="h-8 px-3 text-sm font-medium"
          >
            {expanded ? "Show Less" : "View All"}
          </Button>
        )}
      </div>

      <ul className="space-y-1 flex-1">
        {loading && !activities.length && (
          <li className="text-sm text-gray-400 py-6 text-center">Loading activities...</li>
        )}
        {!loading && !activities.length && (
          <li className="text-sm text-gray-400 py-6 text-center">No recent activity yet.</li>
        )}
        {visibleActivities.map((activity) => (
          <li
            key={activity.id}
            className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div
              className={`w-8 h-8 rounded-lg ${activity.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}
            >
              <Icon name={activity.icon} size={15} className={activity.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-snug group-hover:text-gray-900">
                {activity.title}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className="text-xs text-gray-400">{activity.time}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{activity.date}</span>
                {activity.status && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[activity.status]}`}
                  >
                    {activity.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">
                Created by {activity.createdBy ?? "—"}
                <span className="mx-1.5 text-gray-300">·</span>
                Updated by {activity.updatedBy ?? "—"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
