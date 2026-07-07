"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/layout/AdminShell";
import PackageStatsGrid from "@/components/packages/PackageStatsGrid";
import PackageListTable from "@/components/packages/PackageListTable";
import PackageOverviewSection from "@/components/packages/PackageOverviewSection";
import { getPackageStats, listAllPackages, listRecentlyPublishedPackages } from "@/lib/package-api";
import type { PackageRecord, PackageStats } from "@/lib/package-types";

export default function PackageDashboardPage() {
  const [stats, setStats] = useState<PackageStats | null>(null);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [recentPublished, setRecentPublished] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Packages", href: "/packages" },
        { label: "Package Dashboard" },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Package Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Wizard packages from add_package and legacy catalogue from tbl_packages.
          </p>
        </div>
        <Link
          href="/add-package"
          className="inline-flex h-11 px-5 items-center text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 shadow-sm"
        >
          + Add New Package
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
          {error === "Unauthorized" ? (
            <> — please <a href="/login" className="underline font-medium">sign in again</a>.</>
          ) : (
            <> — make sure the Fastify API is running (<code className="text-xs">npm run dev:api</code>).</>
          )}
        </div>
      )}

      <div className="mb-6">
        <PackageStatsGrid stats={stats} packages={packages} loading={loading} />
      </div>

      <div className="mb-6">
        <PackageOverviewSection packages={packages} recentPublished={recentPublished} />
      </div>

      <PackageListTable
        packages={packages}
        loading={loading}
        variant="dashboard"
        emptyMessage="No packages found."
      />
    </AdminShell>
  );
}
