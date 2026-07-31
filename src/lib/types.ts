export interface NavItem {
  label: string;
  href?: string;
  icon?: string;
  active?: boolean;
  children?: NavItem[];
}

export interface Step {
  number: number;
  title: string;
  department: string;
  icon: string;
}

export interface SupplierFormData {
  supplierName: string;
  supplierPackageName: string;
  supplierCountry: string;
  contactPerson: string;
  supplierEmails: string[];
  supplierWhatsapp: string;
  supplierQuotationFile?: FileList;
  internalSupplierNotes: string;
}