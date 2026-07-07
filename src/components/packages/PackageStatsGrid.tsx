"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import {
  packageAllPackagesHref,
  type PackageRecord,
  type PackageStats,
  type PackageStatusFilter,
} from "@/lib/package-types";

interface PackageStatsGridProps {
  stats: PackageStats | null;
  packages: PackageRecord[];
  loading?: boolean;
}

type StatItem =
  | {
      key: keyof PackageStats;
      label: string;
      filter: PackageStatusFilter;
      icon: string;
      iconClass: string;
      iconBg: string;
    }
  | {
      key: keyof PackageStats;
      label: string;
      href: string;
      icon: string;
      iconClass: string;
      iconBg: string;
    };

const STAT_ITEMS: StatItem[] = [
  {
    key: "total",
    label: "Total Packages",
    filter: "all",
    icon: "Package",
    iconClass: "text-[#8B5CF6]",
    iconBg: "bg-[#F3E8FF]",
  },
  {
    key: "published",
    label: "Published Packages",
    filter: "published",
    icon: "Globe",
    iconClass: "text-[#22C55E]",
    iconBg: "bg-[#DCFCE7]",
  },
  {
    key: "draft",
    label: "Draft Packages",
    filter: "draft",
    icon: "FileText",
    iconClass: "text-[#F59E0B]",
    iconBg: "bg-[#FEF3C7]",
  },
  {
    key: "pending_review",
    label: "Pending Review",
    filter: "pending_review",
    icon: "Clock",
    iconClass: "text-[#3B82F6]",
    iconBg: "bg-[#DBEAFE]",
  },
  {
    key: "expiring_rates",
    label: "Expired Packages",
    href: "/packages/expiring-rates",
    icon: "Calendar",
    iconClass: "text-[#EF4444]",
    iconBg: "bg-[#FEE2E2]",
  },
];

function getStatHref(item: StatItem): string {
  return "filter" in item ? packageAllPackagesHref(item.filter) : item.href;
}

function getPackageDate(pkg: PackageRecord): Date | null {
  const value = pkg.updated_at || pkg.created_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end;
}

function matchesStat(item: StatItem, pkg: PackageRecord): boolean {
  if ("filter" in item) {
    return item.filter === "all" ? pkg.status !== "deleted" : pkg.status === item.filter;
  }

  const validityTo = pkg.supplier_source?.validityTo;
  if (!validityTo) return false;
  const expiry = new Date(validityTo);
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(now.getDate() + 30);
  return !Number.isNaN(expiry.getTime()) && expiry >= now && expiry <= in30Days;
}

function getTrend(item: StatItem, packages: PackageRecord[]) {
  if (!("filter" in item)) {
    return {
      text: "Expiring in next 30 days",
      className: "text-rose-600",
    };
  }

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 30);
  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - 60);

  const matchingPackages = packages.filter((pkg) => matchesStat(item, pkg));
  const current = matchingPackages.filter((pkg) => {
    const date = getPackageDate(pkg);
    return date ? isInRange(date, currentStart, now) : false;
  }).length;
  const previous = matchingPackages.filter((pkg) => {
    const date = getPackageDate(pkg);
    return date ? isInRange(date, previousStart, currentStart) : false;
  }).length;

  if (!previous && !current) {
    return {
      text: "No activity in 30 days",
      className: "text-gray-500",
    };
  }
  if (!previous) {
    return {
      text: `${current} new in 30 days`,
      className: current ? "text-emerald-600" : "text-gray-500",
    };
  }

  const change = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${change > 0 ? "+" : ""}${change}% vs previous 30 days`,
    className: change > 0 ? "text-emerald-600" : change < 0 ? "text-rose-600" : "text-gray-500",
  };
}

export default function PackageStatsGrid({ stats, packages, loading }: PackageStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {STAT_ITEMS.map((item) => {
        const trend = getTrend(item, packages);

        return (
          <Link
            key={item.key}
            href={getStatHref(item)}
            className="rounded-2xl border border-[#E8ECF4] bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`h-10 w-10 rounded-full ${item.iconBg} flex items-center justify-center mb-3`}>
              <Icon name={item.icon} size={18} className={item.iconClass} />
            </div>
            <p className="text-3xl leading-none font-bold text-[#111827]">
              {loading ? "—" : (stats?.[item.key] ?? 0)}
            </p>
            <p className="text-xs font-medium text-[#6B7280] mt-2">{item.label}</p>
            <p className={`text-[11px] mt-2 ${trend.className}`}>{loading ? "Loading activity..." : trend.text}</p>
          </Link>
        );
      })}
    </div>
  );
}
