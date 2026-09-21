import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import SuppliersPanel, {
  type SuppliersPanelHandle,
} from "@/components/suppliers/SuppliersPanel";

export default function SuppliersPage() {
  const panelRef = useRef<SuppliersPanelHandle>(null);

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Suppliers" },
      ]}
    >
      <ListPageHeader
        icon="Building"
        title="Suppliers"
        description="Vendor directory for countries, contacts, relationship status, and consultant notes."
        action={{
          label: "Add Supplier",
          onClick: () => panelRef.current?.openCreate(),
        }}
      />

      <SuppliersPanel ref={panelRef} />
    </AdminShell>
  );
}
