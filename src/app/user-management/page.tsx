"use client";

import AdminShell from "@/components/layout/AdminShell";
import UserManagementPanel from "@/components/users/UserManagementPanel";
import { Icon } from "@/components/ui/icons";

export default function UserManagementPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "User Management" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <Icon name="UserCog" size={22} className="text-[#555E69]" />
          <h1 className="text-xl font-semibold text-[#555E69] tracking-tight">
            User Management
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-2 ml-[30px]">
          Manage admin accounts, roles, and access for the Fayyaz Travels panel.
        </p>
      </div>

      <UserManagementPanel />
    </AdminShell>
  );
}
