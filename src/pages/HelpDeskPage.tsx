import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import HelpDeskPanel from "@/components/help/HelpDeskPanel";

export default function HelpDeskPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Help Desk" },
      ]}
    >
      <ListPageHeader
        icon="HelpCircle"
        title="Help Desk"
        description="Step-by-step guides for every section of the admin panel."
      />
      <HelpDeskPanel />
    </AdminShell>
  );
}
