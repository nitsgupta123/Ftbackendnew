"use client";

import AdminShell from "@/components/layout/AdminShell";
import RolesPanel from "@/components/settings/RolesPanel";
import { Icon } from "@/components/ui/icons";

export default function SettingsRolesPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings" },
        { label: "Roles" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[#555E69] ring-1 ring-[#E5E7EB]">
                <Icon name="Shield" size={20} />
              </div>
              <h1 className="text-xl font-semibold text-[#1F2A44] tracking-tight">
                Settings — Access Control
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-[52px] leading-relaxed">
              Control what each role can view, edit, or delete across the admin panel
              and package builder modules.
            </p>
          </div>
        </div>
      </div>

      <RolesPanel />
    </AdminShell>
  );
}
