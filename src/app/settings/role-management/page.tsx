"use client";

import AdminShell from "@/components/layout/AdminShell";
import RoleManagementDesignPanel from "@/components/settings/RoleManagementDesignPanel";
import { Icon } from "@/components/ui/icons";

export default function SettingsRoleManagementPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings" },
        { label: "Role Management" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[#555E69] ring-1 ring-[#E5E7EB]">
            <Icon name="Shield" size={20} />
          </div>
          <h1 className="text-xl font-semibold text-[#1F2A44] tracking-tight">
            Settings — Role Management
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[52px] leading-relaxed">
          Create, structure, and manage all admin roles with centralized governance.
        </p>
      </div>

      <RoleManagementDesignPanel />
    </AdminShell>
  );
}
