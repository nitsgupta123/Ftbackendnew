"use client";

import AdminShell from "@/components/layout/AdminShell";
import ListPageHeader from "@/components/layout/ListPageHeader";
import EnquiryManagementPanel from "@/components/enquiries/EnquiryManagementPanel";

export default function EnquiryPage() {
  return (
    <AdminShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Enquiry" },
      ]}
    >
      <ListPageHeader
        icon="MessageSquare"
        title="Enquiry"
        description="Review contact form leads, visa and corporate enquiries, and popup submissions from the website."
      />

      <EnquiryManagementPanel />
    </AdminShell>
  );
}
