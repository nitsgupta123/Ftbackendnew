import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import PromotionsPanel, {
  type PromotionsPanelHandle,
} from "@/components/promotions/PromotionsPanel";

export default function PromotionsPage() {
  const panelRef = useRef<PromotionsPanelHandle>(null);

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Promotions" },
      ]}
    >
      <ListPageHeader
        icon="Megaphone"
        title="Promotions"
        description="Create scheduled percentage or fixed-amount package offers."
        action={{
          label: "Add Promotion",
          onClick: () => panelRef.current?.openCreate(),
        }}
      />

      <PromotionsPanel ref={panelRef} />
    </AdminShell>
  );
}
