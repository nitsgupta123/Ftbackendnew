"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { packageAllPackagesHref, type PackageRecord } from "@/lib/package-types";

interface PackageOverviewSectionProps {
  packages: PackageRecord[];
  recentPublished: PackageRecord[];
}

interface ChartPoint {
  day: string;
  key: string;
  published: number;
  draft: number;
}

interface RecentPublishedItem {
  key: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  source: string;
}

function getPackageDate(pkg: PackageRecord): Date | null {
  const value = pkg.updated_at || pkg.created_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatChartDay(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildChartPoints(packages: PackageRecord[]): ChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      day: formatChartDay(date),
      key: getDayKey(date),
      published: 0,
      draft: 0,
    };
  });

  const pointByKey = new Map(points.map((point) => [point.key, point]));

  for (const pkg of packages) {
    if (pkg.status !== "published" && pkg.status !== "draft") continue;
    const date = getPackageDate(pkg);
    if (!date) continue;
    const point = pointByKey.get(getDayKey(date));
    if (point) {
      point[pkg.status] += 1;
    }
  }

  return points;
}

function formatPackageDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getPublishedAt(pkg: PackageRecord): string | null {
  return pkg.review_publish?.publishedAt || pkg.updated_at || pkg.created_at || null;
}

function buildRecentPublished(packages: PackageRecord[]): RecentPublishedItem[] {
  return packages.map((pkg, index) => {
    const subtitle =
      pkg.package_basics?.countriesCovered ||
      pkg.package_basics?.citiesOrRegions ||
      pkg.slug ||
      pkg.supplier_name ||
      "International";
    const publishedAt = getPublishedAt(pkg);

    return {
      key: `${pkg.source ?? "pkg"}-${pkg.package_id ?? pkg.id}`,
      title: (pkg.package_title ?? "").trim() || `Package ${index + 1}`,
      subtitle,
      publishedAt: publishedAt ? formatPackageDate(publishedAt) : "Unknown",
      source: pkg.source === "legacy" ? "Legacy" : "Wizard",
    };
  });
}

export default function PackageOverviewSection({ packages, recentPublished }: PackageOverviewSectionProps) {
  const width = 560;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 34, left: 34 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const chartPoints = buildChartPoints(packages);
  const maxValue = Math.max(1, ...chartPoints.flatMap((point) => [point.published, point.draft]));
  const maxY = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const ticks = Array.from({ length: 5 }, (_, index) => index * (maxY / 4));

  const toX = (i: number) => padding.left + i / (chartPoints.length - 1) * chartW;
  const toY = (v: number) => padding.top + chartH - v / maxY * chartH;

  const makePath = (key: "published" | "draft") =>
  chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index)} ${toY(point[key])}`).join(
    " "
  );

  const recentPublishedItems = buildRecentPublished(recentPublished);

  return (
    <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 rounded-2xl border border-[#E8ECF4] bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Package Overview</h2>
            <p className="text-xs text-gray-500 mt-1">Updated packages by current status.</p>
          </div>
          <Button
            type="button"
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-xs text-gray-600 hover:bg-gray-50">
            
            Last 7 Days
          </Button>
        </div>

        <div className="flex items-center gap-5 mb-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
            Published
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
            Draft
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {ticks.map((tick) =>
          <g key={tick}>
              <line x1={padding.left} y1={toY(tick)} x2={width - padding.right} y2={toY(tick)} stroke="#EEF2F7" />
              <text x={padding.left - 8} y={toY(tick) + 3} textAnchor="end" className="fill-[#9CA3AF] text-[10px]">
                {tick}
              </text>
            </g>
          )}

          <path d={makePath("published")} fill="none" stroke="#22C55E" strokeWidth={2.5} />
          <path d={makePath("draft")} fill="none" stroke="#2563EB" strokeWidth={2.5} />

          {chartPoints.map((point, index) =>
          <g key={point.day}>
              <circle cx={toX(index)} cy={toY(point.published)} r={3.5} fill="#22C55E" />
              <circle cx={toX(index)} cy={toY(point.draft)} r={3.5} fill="#2563EB" />
              <text x={toX(index)} y={height - 10} textAnchor="middle" className="fill-[#9CA3AF] text-[10px]">
                {point.day}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="rounded-2xl border border-[#E8ECF4] bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#111827]">Recently Published Packages</h2>
          <Link
            href={packageAllPackagesHref("published")}
            className="text-xs font-medium text-[#374151] hover:text-[#111827]">
            
            View All
          </Link>
        </div>

        <div className="space-y-4">
          {recentPublishedItems.length ?
          recentPublishedItems.map((item) =>
          <div key={item.key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{item.title}</p>
                  <p className="text-xs text-[#6B7280] truncate">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6B7280]">Source</p>
                  <p className="text-xs font-semibold text-[#111827]">{item.source}</p>
                </div>
                <div className="text-right w-20">
                  <p className="text-xs text-[#6B7280]">Published</p>
                  <p className="text-xs font-semibold text-[#111827]">{item.publishedAt}</p>
                </div>
              </div>
          ) :

          <p className="text-sm text-gray-500">No published packages yet.</p>
          }
        </div>
      </div>
    </section>);

}
