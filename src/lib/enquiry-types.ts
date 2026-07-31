export type EnquiryMessageType =
  | "contactus"
  | "popupenquery"
  | "contactus_visa"
  | "contactus_corporate";

export type EnquiryStatusFilter = "all" | "open" | "closed";
export type EnquiryTypeFilter = "all" | EnquiryMessageType;
export type EnquirySortField = "insert_date" | "first_name" | "email";

export interface EnquiryRecord {
  id: number;
  title: string;
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  location: string;
  origin: string;
  originName: string | null;
  destination: string;
  destinationName: string | null;
  departureDate: string;
  returnDate: string;
  flexible: number;
  adults: string;
  youngAdults: string;
  children: string;
  infants: string;
  budget: string;
  message: string;
  aboutUs: string;
  services: string;
  currency: string;
  pageUrl: string;
  status: number;
  messageType: string;
  systemIp: string;
  systemInfo: string;
  insertDate: string | null;
  editDate: string | null;
}

export interface EnquiryStats {
  total: number;
  open: number;
  closed: number;
  thisMonth: number;
  contactUs: number;
  popup: number;
  visa: number;
  corporate: number;
}

export interface ListEnquiriesParams {
  search?: string;
  type?: EnquiryTypeFilter;
  status?: EnquiryStatusFilter;
  sort?: EnquirySortField;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListEnquiriesResult {
  enquiries: EnquiryRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ENQUIRY_TYPE_LABELS: Record<EnquiryMessageType, string> = {
  contactus: "Contact Us",
  popupenquery: "Popup / Newsletter",
  contactus_visa: "Visa",
  contactus_corporate: "Corporate",
};

export const ENQUIRY_TYPE_FILTER_OPTIONS: {
  value: EnquiryTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All types" },
  { value: "contactus", label: "Contact Us" },
  { value: "popupenquery", label: "Popup / Newsletter" },
  { value: "contactus_visa", label: "Visa" },
  { value: "contactus_corporate", label: "Corporate" },
];

export const ENQUIRY_STATUS_FILTER_OPTIONS: {
  value: EnquiryStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export const ENQUIRY_SORT_OPTIONS: { value: EnquirySortField; label: string }[] =
  [
    { value: "insert_date", label: "Date received" },
    { value: "first_name", label: "Name" },
    { value: "email", label: "Email" },
  ];

export function enquiryDisplayName(enquiry: EnquiryRecord): string {
  const name = [enquiry.firstName, enquiry.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  if (name) return name;
  if (enquiry.email.trim()) return enquiry.email.trim();
  return `Enquiry #${enquiry.id}`;
}

export function enquiryTypeLabel(messageType: string): string {
  return (
    ENQUIRY_TYPE_LABELS[messageType as EnquiryMessageType] ?? messageType
  );
}

export function isEnquiryOpen(status: number): boolean {
  return status !== 2;
}
