import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import UserManagementPanel, {
  type UserManagementPanelHandle,
} from "@/components/users/UserManagementPanel";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SettingsUserManagementPage() {
  const panelRef = useRef<UserManagementPanelHandle>(null);
  const { user: currentUser } = useAuth();
  const canManage = currentUser?.role === "super_admin";

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings/user-management" },
        { label: "User Management" },
      ]}
    >
      <ListPageHeader
        icon="UserCog"
        title="User Management"
        description="Manage admin accounts, roles, and access for the Fayyaz Travels panel."
        action={
          canManage
            ? {
                label: "Add User",
                onClick: () => panelRef.current?.openCreate(),
              }
            : undefined
        }
      />

      <UserManagementPanel ref={panelRef} />
    </AdminShell>
  );
}
