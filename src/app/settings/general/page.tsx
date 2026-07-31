"use client";

import AdminShell from "@/components/layout/AdminShell";
import SettingsGeneralPanel from "@/components/settings/SettingsGeneralPanel";
import { Icon } from "@/components/ui/icons";

export default function SettingsGeneralPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings" },
        { label: "General" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="Settings" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">
            Settings - General
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">
          Manage global app settings used across dashboard, website metadata, and contact information.
        </p>
      </div>

      <SettingsGeneralPanel />
    </AdminShell>
  );
}
