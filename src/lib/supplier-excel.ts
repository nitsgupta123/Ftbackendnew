import {
  RELATIONSHIP_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
  buildSupplierSummary,
  type SupplierRecord,
} from "@/lib/supplier-types";
import { toDateOnlySgt } from "@/lib/format-date";

const EXCEL_HEADERS = [
  "Date Added/Updated",
  "Country",
  "Active Status",
  "City / Tour Area",
  "Relationship Status",
  "Company Name",
  "Services Offered",
  "Point of Contact Name",
  "Email Address",
  "Contact Number",
  "Website",
  "Notes",
  "Problems with Services",
  "Account details Local Currency /",
  "TC POC for the Fixed Departure Package",
  "Relationship Owner",
  "Summary",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cell(value: string | null | undefined): string {
  return escapeCsvCell(value?.trim() ? value : "");
}

function formatDate(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

export function suppliersToExcelCsv(suppliers: SupplierRecord[]): string {
  const lines = [
    EXCEL_HEADERS.join(","),
    ...suppliers.map((supplier) =>
      [
        cell(formatDate(supplier.date_added_updated)),
        cell(supplier.country),
        cell(SUPPLIER_STATUS_LABELS[supplier.status] ?? supplier.status),
        cell(supplier.city_tour_area),
        cell(RELATIONSHIP_STATUS_LABELS[supplier.relationship_status]),
        cell(supplier.company_name),
        cell(supplier.services_offered),
        cell(supplier.contact_person),
        cell(supplier.email_address),
        cell(supplier.contact_number),
        cell(supplier.website),
        cell(supplier.notes),
        cell(supplier.problems_with_services),
        cell(supplier.account_details),
        cell(supplier.tc_poc_fixed_departure),
        cell(supplier.relationship_owner),
        cell(buildSupplierSummary(supplier)),
      ].join(",")
    ),
  ];

  // UTF-8 BOM so Excel opens accents correctly
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadSuppliersExcel(suppliers: SupplierRecord[]) {
  const csv = suppliersToExcelCsv(suppliers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FT-Suppliers-${toDateOnlySgt(new Date()) ?? "export"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
