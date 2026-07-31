"use client";

import { useMemo, useState } from "react";
import type { ActivityItem } from "./types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type ActivityLogTableProps = {
  activityLog: ActivityItem[];
};

export default function ActivityLogTable({ activityLog }: ActivityLogTableProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("all");

  const actorOptions = useMemo(() => {
    const set = new Set<string>(["all"]);
    for (const log of activityLog) {
      if (log.actor?.trim()) set.add(log.actor);
    }
    return Array.from(set);
  }, [activityLog]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activityLog.filter((entry) => {
      if (actorFilter !== "all" && entry.actor !== actorFilter) return false;
      if (!q) return true;
      return (
        entry.actor.toLowerCase().includes(q) ||
        entry.employee.toLowerCase().includes(q) ||
        entry.permission.toLowerCase().includes(q) ||
        entry.previousAccess.toLowerCase().includes(q) ||
        entry.newAccess.toLowerCase().includes(q)
      );
    });
  }, [activityLog, actorFilter, search]);

  return (
    <div className="mx-5 mb-5 rounded-xl border border-[#E8ECF0] overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-4 py-3 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white text-left flex items-center justify-between gap-3"
      >
        <div>
          <h3 className="text-sm font-semibold text-[#1F2A44]">Activity Log</h3>
          <p className="text-xs text-gray-500 mt-1">
            Tracks permission and role changes made by Owner/Super Admin.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A68231]">
          {open ? "Hide Logs" : "Show Logs"}
          <Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} />
        </span>
      </button>

      {open && (
        <>
          <div className="px-4 py-3 border-b border-[#E8ECF0] bg-[#FAFBFC]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actor, employee, permission..."
                className="h-10 border-[#E5E7EB]"
              />
              <NativeSelect
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="h-10 border-[#E5E7EB]"
              >
                <option value="all">All</option>
                {actorOptions
                  .filter((actor) => actor !== "all")
                  .map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
              </NativeSelect>
            </div>
          </div>

          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-[#E8ECF0] bg-[#FAFBFC]">
                  <th className="sticky left-0 z-20 bg-[#FAFBFC] px-3 py-2">Who Changed</th>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Permission Changed</th>
                  <th className="px-3 py-2">Previous Access</th>
                  <th className="px-3 py-2">New Access</th>
                  <th className="sticky right-0 z-20 bg-[#FAFBFC] px-3 py-2">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {(filteredLogs.length ? filteredLogs : []).slice(0, 200).map((entry) => (
                  <tr key={entry.id} className="border-b border-[#EEF1F4]">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2">{entry.actor}</td>
                    <td className="px-3 py-2">{entry.employee}</td>
                    <td className="px-3 py-2">{entry.permission}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.previousAccess}</td>
                    <td className="px-3 py-2 text-gray-600">{entry.newAccess}</td>
                    <td className="sticky right-0 z-10 bg-white px-3 py-2 text-gray-600">
                      {formatPackageDateTime(entry.createdAt)}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-sm text-gray-500" colSpan={6}>
                      No log entries match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
