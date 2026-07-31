export interface AdminSettings {
  site_name: string;
  company_name: string;
  support_email: string;
  support_phone: string;
  office_address: string;
  timezone: string;
  homepage_title: string;
  homepage_description: string;
  maintenance_mode: boolean;
  /** Comma/newline-separated Fayyaz management emails auto-CC'd on supplier quotes */
  quote_cc_emails: string;
  /** Comma/newline-separated Fayyaz management emails auto-BCC'd on supplier quotes */
  quote_bcc_emails: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface UpdateAdminSettingsInput {
  site_name: string;
  company_name: string;
  support_email: string;
  support_phone: string;
  office_address: string;
  timezone: string;
  homepage_title: string;
  homepage_description: string;
  maintenance_mode: boolean;
  quote_cc_emails: string;
  quote_bcc_emails: string;
}
