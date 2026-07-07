"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import OverviewChart from "@/components/dashboard/OverviewChart";
import RecentActivities from "@/components/dashboard/RecentActivities";
import QuickActions from "@/components/dashboard/QuickActions";
import ContentSummary from "@/components/dashboard/ContentSummary";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardOverview } from "@/lib/dashboard-api";
import {
  buildStatCards,
  mapActivities,
  QUICK_ACTIONS,
  STAT_CARD_CONFIG,
  type ChartDataPoint,
  type StatCardData,
} from "@/lib/dashboard-data";
import type { ContentSummaryItem } from "@/lib/dashboard-types";

const CHART_PERIODS = {
  "Last 7 Days": 7,
  "Last 30 Days": 30,
  "Last 90 Days": 90,
} as const;

type ChartPeriodLabel = keyof typeof CHART_PERIODS;

export default function DashboardPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statCards, setStatCards] = useState<StatCardData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activities, setActivities] = useState<ReturnType<typeof mapActivities>>([]);
  const [contentSummary, setContentSummary] = useState<ContentSummaryItem[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodLabel>("Last 7 Days");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.fullName?.split(" ")[0] ?? "Admin";

  const loadDashboard = useCallback(async (days: number, refreshChartOnly = false) => {
    if (refreshChartOnly) {
      setChartLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const overview = await getDashboardOverview(days);
      setStatCards(buildStatCards(overview.stats));
      setChartData(overview.chart);
      setActivities(mapActivities(overview.activities));
      setContentSummary(overview.contentSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(CHART_PERIODS[chartPeriod]);
  }, [chartPeriod, loadDashboard]);

  const handleChartPeriodChange = (period: ChartPeriodLabel) => {
    setChartPeriod(period);
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Overview" },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
        }`}
      >
        <Header
          breadcrumbs={breadcrumbs}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Here&apos;s what&apos;s happening with your platform today.
              </p>
            </div>
            <p className="text-sm text-gray-400 sm:hidden">Dashboard / Overview</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
              {error}
              {error === "Unauthorized" ? (
                <>
                  {" "}
                  — please{" "}
                  <a href="/login" className="underline font-medium">
                    sign in again
                  </a>
                  .
                </>
              ) : (
                <>
                  {" "}
                  — make sure the Fastify API is running (
                  <code className="text-xs">npm run dev:api</code>).
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(loading && !statCards.length
              ? STAT_CARD_CONFIG.map((config) => ({
                  label: config.label,
                  value: 0,
                  change: 0,
                  icon: config.icon,
                  iconBg: config.iconBg,
                  iconColor: config.iconColor,
                }))
              : statCards
            ).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            <div className="lg:col-span-5">
              <OverviewChart
                data={chartData}
                period={chartPeriod}
                onPeriodChange={handleChartPeriodChange}
                loading={chartLoading}
              />
            </div>
            <div className="lg:col-span-4">
              <RecentActivities activities={activities} loading={loading} />
            </div>
            <div className="lg:col-span-3">
              <QuickActions actions={QUICK_ACTIONS} />
            </div>
          </div>

          <ContentSummary items={contentSummary} loading={loading} />
        </main>
      </div>
    </div>
  );
}
