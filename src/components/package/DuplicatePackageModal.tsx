"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { listPackages } from "@/lib/package-api";
import type { PackageRecord } from "@/lib/package-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DuplicatePackageModalProps {
  open: boolean;
  onClose: () => void;
  duplicating?: boolean;
  onDuplicate: (pkg: PackageRecord) => Promise<void>;
}

export default function DuplicatePackageModal({
  open,
  onClose,
  duplicating = false,
  onDuplicate,
}: DuplicatePackageModalProps) {
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setSelectedId(null);
      setSearch("");
      listPackages()
        .then((result) =>
          setPackages(result.packages.filter((pkg) => pkg.status !== "deleted"))
        )
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load packages")
        )
        .finally(() => setLoading(false));
    });
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) => {
      const title = (pkg.package_title ?? "").toLowerCase();
      const slug = (pkg.slug ?? "").toLowerCase();
      return title.includes(q) || slug.includes(q) || String(pkg.id).includes(q);
    });
  }, [packages, search]);

  if (!open) return null;

  async function handleDuplicate() {
    const selected = packages.find((pkg) => pkg.id === selectedId);
    if (!selected) return;
    await onDuplicate(selected);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/40"
        aria-label="Close"
        onClick={() => {
          if (!duplicating) onClose();
        }}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Duplicate Existing Package</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Copy an existing wizard package into a new draft
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={duplicating}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="border-b border-[#E5E7EB] px-6 py-3">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3">
            <Icon name="Search" size={14} className="shrink-0 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, slug, or ID..."
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-sm text-gray-500">Loading packages...</p>}
          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-gray-500">No packages found to duplicate.</p>
          )}
          <div className="space-y-2">
            {filtered.map((pkg) => {
              const selected = selectedId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedId(pkg.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-[#B48A2C] bg-[#B48A2C]/5"
                      : "border-[#E5E7EB] hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {pkg.package_title || "Untitled package"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        ID {pkg.id}
                        {pkg.slug ? ` · /${pkg.slug}` : ""}
                        {` · Step ${pkg.current_step || 1}`}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
                      {pkg.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={duplicating}
            className="h-10 rounded-xl px-4 text-sm text-gray-600"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleDuplicate()}
            disabled={!selectedId || duplicating}
            className="h-10 rounded-xl bg-[#1F2A44] px-4 text-sm font-medium text-white hover:bg-[#1F2A44]/90 disabled:opacity-50"
          >
            {duplicating ? "Duplicating..." : "Duplicate as Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}
