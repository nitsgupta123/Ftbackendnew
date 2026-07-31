"use client";

import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import PromotionsPanel, {
  type PromotionsPanelHandle,
} from "@/components/promotions/PromotionsPanel";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default function PromotionsPage() {
  const panelRef = useRef<PromotionsPanelHandle>(null);

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Promotions" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A68231]/12 text-[#A68231] ring-1 ring-[#A68231]/20">
                <Icon name="Megaphone" size={20} />
              </div>
              <h1 className="text-xl font-semibold text-[#1F2A44] tracking-tight">
                Promotions
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-[52px] leading-relaxed">
              Create scheduled percentage or fixed-amount package offers.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => panelRef.current?.openCreate()}
            className="inline-flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-semibold text-white bg-[#A68231] rounded-lg shadow-sm hover:opacity-90"
          >
            <Icon name="Plus" size={16} />
            Add Promotion
          </Button>
        </div>
      </div>

      <PromotionsPanel ref={panelRef} />
    </AdminShell>
  );
}
