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
  supplierCurrency: string;
  contactPerson: string;
  supplierEmail: string;
  supplierWhatsapp: string;
  supplierQuotedNetPrice: string;
  validityFrom: string;
  validityTo: string;
  supplierBookingDeadline: string;
  supplierQuotationFile?: FileList;
  paymentTerms: string;
  cancellationTerms: string;
  internalSupplierNotes: string;
}