"use client";

import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import UserManagementPanel, {
  type UserManagementPanelHandle,
} from "@/components/users/UserManagementPanel";
import { useAuth } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default function UserManagementPage() {
  const panelRef = useRef<UserManagementPanelHandle>(null);
  const { user: currentUser } = useAuth();
  const canManage = currentUser?.role === "super_admin";

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "User Management" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
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

          {canManage && (
            <Button
              type="button"
              onClick={() => panelRef.current?.openCreate()}
              className="inline-flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-semibold !text-white !bg-[#A68231] !border-[#A68231] rounded-lg shadow-sm hover:!bg-white hover:!text-[#A68231] hover:!border-[#A68231] transition-colors"
            >
              <Icon name="Plus" size={16} />
              Add User
            </Button>
          )}
        </div>
      </div>

      <UserManagementPanel ref={panelRef} />
    </AdminShell>
  );
}
