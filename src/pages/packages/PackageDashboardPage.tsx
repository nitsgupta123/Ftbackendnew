import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import PackageStatsGrid from "@/components/packages/PackageStatsGrid";
import PackageListTable from "@/components/packages/PackageListTable";
import PackageOverviewSection from "@/components/packages/PackageOverviewSection";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { getPackageStats, listAllPackages, listRecentlyPublishedPackages } from "@/lib/package-api";
import type { PackageRecord, PackageStats } from "@/lib/package-types";

const PAGE_SIZE = 10;

export default function PackageDashboardPage() {
  const [stats, setStats] = useState<PackageStats | null>(null);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [recentPublished, setRecentPublished] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(packages.length / PAGE_SIZE));
  const pagedPackages = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return packages.slice(start, start + PAGE_SIZE);
  }, [packages, page]);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, packagesRes, recentPublishedRes] = await Promise.all([
          getPackageStats(),
          listAllPackages(),
          listRecentlyPublishedPackages(),
        ]);
        setStats(statsRes.stats);
        setPackages(packagesRes.packages.filter((pkg) => pkg.status !== "deleted"));
        setRecentPublished(recentPublishedRes.packages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load package dashboard");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Packages", href: "/packages" },
        { label: "Package Dashboard" },
      ]}
    >
      <ListPageHeader
        icon="LayoutDashboard"
        title="Package Dashboard"
        description="Overview of every travel package by status, plus recent activity."
        action={{ label: "Add New Package", href: "/add-package", icon: "Plus" }}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
          {error === "Unauthorized" ? (
            <> — please <Link to="/login" className="underline font-medium">sign in again</Link>.</>
          ) : null}
        </div>
      )}

      <div className="mb-6">
        <PackageStatsGrid stats={stats} packages={packages} loading={loading} />
      </div>

      <div className="mb-6">
        <PackageOverviewSection packages={packages} recentPublished={recentPublished} />
      </div>

      {!loading && packages.length > 0 && (
        <p className="mb-3 text-xs text-gray-400">
          Showing {pagedPackages.length} of {packages.length} packages
        </p>
      )}

      <PackageListTable
        packages={pagedPackages}
        loading={loading}
        variant="dashboard"
        emptyMessage="No packages found."
      />

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#E8ECF0] bg-[#FAFBFC] px-4 py-3">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
            >
              <Icon name="ChevronLeft" size={16} className="mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
            >
              Next
              <Icon name="ChevronRight" size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
