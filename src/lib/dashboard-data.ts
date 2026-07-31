import { formatPackageDate, SGT_TIME_ZONE } from "./format-date";
import type { DashboardActivity, DashboardStats } from "./dashboard-types";

export interface StatCardData {
  label: string;
  value: number;
  change: number;
  icon: string;
  iconBg: string;
  iconColor: string;
}

export interface QuickActionItem {
  label: string;
  icon: string;
  href: string;
  iconBg: string;
  iconColor: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  time: string;
  date: string;
  createdBy: string | null;
  updatedBy: string | null;
  icon: string;
  iconBg: string;
  iconColor: string;
  status?: "Published" | "Draft" | "Pending";
}

export interface ChartDataPoint {
  date: string;
  visitors: number;
  pageViews: number;
}

type StatKey = keyof DashboardStats;

interface StatCardConfig extends Omit<StatCardData, "value" | "change"> {
  key: StatKey;
}

export const STAT_CARD_CONFIG: StatCardConfig[] = [
  {
    label: "Total Pages",
    icon: "FileStack",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    key: "pages",
  },
  {
    label: "Total Destinations",
    icon: "MapPin",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    key: "destinations",
  },
  {
    label: "Total Packages",
    icon: "Package",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    key: "packages",
  },
  {
    label: "Total Testimonials",
    icon: "Star",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    key: "testimonials",
  },
  {
    label: "Total Blogs",
    icon: "FileText",
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-500",
    key: "blogs",
  },
  {
    label: "Total Products",
    icon: "ShoppingCart",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    key: "products",
  },
  {
    label: "Newsletter Subscribers",
    icon: "Mail",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
    key: "newsletterSubscribers",
  },
];

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    label: "Add New Package",
    icon: "Package",
    href: "/add-package",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
  },
  {
    label: "Write New Blog",
    icon: "FileText",
    href: "/blogs/new",
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-500",
  },
  {
    label: "Manage Packages",
    icon: "Package",
    href: "/packages",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    label: "View All Blogs",
    icon: "FileText",
    href: "/blogs/all",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    label: "User Management",
    icon: "Users",
    href: "/user-management",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    label: "Package Categories",
    icon: "FileStack",
    href: "/packages/categories",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
  },
];

export function buildStatCards(stats: DashboardStats): StatCardData[] {
  return STAT_CARD_CONFIG.map((config) => {
    const metric = stats[config.key];
    return {
      label: config.label,
      value: metric.total,
      change: metric.change,
      icon: config.icon,
      iconBg: config.iconBg,
      iconColor: config.iconColor,
    };
  });
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", {
    timeZone: SGT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function mapActivities(activities: DashboardActivity[]): ActivityItem[] {
  return activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    time: formatRelativeTime(activity.occurredAt),
    date: formatPackageDate(activity.occurredAt),
    createdBy: activity.createdBy,
    updatedBy: activity.updatedBy,
    icon: activity.icon,
    iconBg: activity.iconBg,
    iconColor: activity.iconColor,
    status: activity.status,
  }));
}
