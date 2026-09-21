import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import RoleManagementDesignPanel, {
  type RoleManagementDesignPanelHandle,
} from "@/components/settings/RoleManagementDesignPanel";

export default function SettingsRoleManagementPage() {
  const panelRef = useRef<RoleManagementDesignPanelHandle>(null);

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings/user-management" },
        { label: "Role Management" },
      ]}
    >
      <ListPageHeader
        icon="Shield"
        title="Role Management"
        description="Create, structure, and manage all admin roles with centralized governance."
        action={{
          label: "Add New Role",
          onClick: () => panelRef.current?.openCreate(),
        }}
      />

      <RoleManagementDesignPanel ref={panelRef} />
    </AdminShell>
  );
}
