"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { packageAllPackagesHref, type PackageRecord } from "@/lib/package-types";
import { formatPackageDate, SGT_TIME_ZONE } from "@/lib/format-date";

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

function getSgtDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function parseDayKeyAsUtcDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00Z`);
}

function formatChartDay(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    timeZone: SGT_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildChartPoints(packages: PackageRecord[]): ChartPoint[] {
  const sgtToday = parseDayKeyAsUtcDate(getSgtDayKey(new Date()));

  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sgtToday);
    date.setUTCDate(sgtToday.getUTCDate() - (6 - index));
    return {
      day: formatChartDay(date),
      key: getSgtDayKey(date),
      published: 0,
      draft: 0,
    };
  });

  const pointByKey = new Map(points.map((point) => [point.key, point]));

  for (const pkg of packages) {
    if (pkg.status !== "published" && pkg.status !== "draft") continue;
    const date = getPackageDate(pkg);
    if (!date) continue;
    const point = pointByKey.get(getSgtDayKey(date));
    if (point) {
      point[pkg.status] += 1;
    }
  }

  return points;
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
      <div className="xl:col-span-2 rounded-2xl border border-[#E8ECF4] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="mb-3 flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
            Published
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
            Draft
          </span>
        </div>

        <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[520px] w-full">
          {ticks.map((tick) =>
          <g key={tick}>
              <line x1={padding.left} y1={toY(tick)} x2={width - padding.right} y2={toY(tick)} stroke="#EEF2F7" />
              <text x={padding.left - 8} y={toY(tick) + 3} textAnchor="end" className="fill-[#9CA3AF] text-[10px]">
                {tick}
              </text>
            </g>
          )}

          {/* Draft under Published so equal values still show the green series */}
          <path d={makePath("draft")} fill="none" stroke="#2563EB" strokeWidth={2.5} />
          <path d={makePath("published")} fill="none" stroke="#22C55E" strokeWidth={2.5} />

          {chartPoints.map((point, index) => {
            const x = toX(index);
            const publishedY = toY(point.published);
            const draftY = toY(point.draft);
            const overlapping = point.published === point.draft;

            return (
              <g key={point.key}>
                {overlapping ?
                <>
                    <circle cx={x} cy={publishedY} r={5} fill="#22C55E" />
                    <circle cx={x} cy={draftY} r={2.75} fill="#2563EB" />
                  </> :

                <>
                    <circle cx={x} cy={draftY} r={3.5} fill="#2563EB" />
                    <circle cx={x} cy={publishedY} r={3.5} fill="#22C55E" />
                  </>
                }
                <text x={x} y={height - 10} textAnchor="middle" className="fill-[#9CA3AF] text-[10px]">
                  {point.day}
                </text>
              </g>
            );
          })}
        </svg>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8ECF4] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
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
          <div key={item.key} className="flex items-start gap-2 sm:items-center sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{item.title}</p>
                  <p className="text-xs text-[#6B7280] truncate">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6B7280]">Source</p>
                  <p className="text-xs font-semibold text-[#111827]">{item.source}</p>
                </div>
                <div className="w-16 text-right sm:w-20">
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
