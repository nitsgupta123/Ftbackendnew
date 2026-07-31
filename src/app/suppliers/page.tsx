"use client";

import { useRef } from "react";
import AdminShell from "@/components/layout/AdminShell";
import SuppliersPanel, {
  type SuppliersPanelHandle,
} from "@/components/suppliers/SuppliersPanel";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export default function SuppliersPage() {
  const panelRef = useRef<SuppliersPanelHandle>(null);

  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Suppliers" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A68231]/12 text-[#A68231] ring-1 ring-[#A68231]/20">
                <Icon name="Users" size={20} />
              </div>
              <h1 className="text-xl font-semibold text-[#1F2A44] tracking-tight">
                Supplier Management
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-[52px] leading-relaxed">
              Maintain the vendor directory — countries, contacts, relationship
              status, services, and ownership notes used by consultants.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => panelRef.current?.openCreate()}
            className="inline-flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-semibold text-white bg-[#A68231] rounded-lg shadow-sm hover:opacity-90"
          >
            <Icon name="Plus" size={16} />
            Add Supplier
          </Button>
        </div>
      </div>

      <SuppliersPanel ref={panelRef} />
    </AdminShell>
  );
}
