import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import RolesPanel from "@/components/settings/RolesPanel";

export default function SettingsRolesPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings/user-management" },
        { label: "Access Control" },
      ]}
    >
      <ListPageHeader
        icon="Shield"
        title="Access Control"
        description="Control what each role can view, edit, or delete across the admin panel and package builder modules."
      />

      <RolesPanel />
    </AdminShell>
  );
}
