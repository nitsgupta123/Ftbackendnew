import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import SettingsGeneralPanel from "@/components/settings/SettingsGeneralPanel";

export default function SettingsGeneralPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings/general" },
        { label: "General Settings" },
      ]}
    >
      <ListPageHeader
        icon="Settings"
        title="General Settings"
        description="Website contact details, homepage SEO text, and supplier quote email copies."
      />

      <SettingsGeneralPanel />
    </AdminShell>
  );
}
