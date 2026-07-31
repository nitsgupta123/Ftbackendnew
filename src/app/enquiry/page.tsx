"use client";

import AdminShell from "@/components/layout/AdminShell";
import EnquiryManagementPanel from "@/components/enquiries/EnquiryManagementPanel";
import { Icon } from "@/components/ui/icons";

export default function EnquiryPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Enquiry" },
      ]}
    >
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A68231]/12 text-[#A68231] ring-1 ring-[#A68231]/20">
                <Icon name="MessageSquare" size={20} />
              </div>
              <h1 className="text-xl font-semibold text-[#1F2A44] tracking-tight">
                Enquiry
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-[52px] leading-relaxed">
              Review contact form leads, visa and corporate enquiries, and popup
              submissions from the website.
            </p>
          </div>
        </div>
      </div>

      <EnquiryManagementPanel />
    </AdminShell>
  );
}
