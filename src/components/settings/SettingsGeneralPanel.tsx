import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getSettings, updateSettings } from "@/lib/settings-api";
import type { UpdateAdminSettingsInput } from "@/lib/settings-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { usePermissions } from "@/components/auth/PermissionsProvider";

const fieldClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";

const initialForm: UpdateAdminSettingsInput = {
  site_name: "",
  company_name: "",
  support_email: "",
  support_phone: "",
  office_address: "",
  timezone: "Asia/Singapore",
  homepage_title: "",
  homepage_description: "",
  maintenance_mode: false,
  quote_cc_emails: "",
  quote_bcc_emails: "",
};

export default function SettingsGeneralPanel() {
  const { can } = usePermissions();
  const canEdit = can("settings", "edit");
  const [form, setForm] = useState<UpdateAdminSettingsInput>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { settings } = await getSettings();
      setForm({
        site_name: settings.site_name,
        company_name: settings.company_name,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        office_address: settings.office_address,
        timezone: settings.timezone,
        homepage_title: settings.homepage_title,
        homepage_description: settings.homepage_description,
        maintenance_mode: settings.maintenance_mode,
        quote_cc_emails: settings.quote_cc_emails,
        quote_bcc_emails: settings.quote_bcc_emails,
      });
      setLastUpdatedAt(settings.updated_at);
      setLastUpdatedBy(settings.updated_by);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const updateField = <K extends keyof UpdateAdminSettingsInput>(
    key: K,
    value: UpdateAdminSettingsInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const disabled = loading || saving || !canEdit;

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: UpdateAdminSettingsInput = {
        site_name: form.site_name.trim(),
        company_name: form.company_name.trim(),
        support_email: form.support_email.trim(),
        support_phone: form.support_phone.trim(),
        office_address: form.office_address.trim(),
        timezone: "Asia/Singapore",
        homepage_title: form.homepage_title.trim(),
        homepage_description: form.homepage_description.trim(),
        maintenance_mode: form.maintenance_mode,
        quote_cc_emails: form.quote_cc_emails.trim(),
        quote_bcc_emails: form.quote_bcc_emails.trim(),
      };

      const { settings } = await updateSettings(payload);
      setForm({
        site_name: settings.site_name,
        company_name: settings.company_name,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        office_address: settings.office_address,
        timezone: settings.timezone,
        homepage_title: settings.homepage_title,
        homepage_description: settings.homepage_description,
        maintenance_mode: settings.maintenance_mode,
        quote_cc_emails: settings.quote_cc_emails,
        quote_bcc_emails: settings.quote_bcc_emails,
      });
      setLastUpdatedAt(settings.updated_at);
      setLastUpdatedBy(settings.updated_by);
      setSuccess("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const formattedUpdatedAt = useMemo(
    () => (lastUpdatedAt ? formatPackageDateTime(lastUpdatedAt) : null),
    [lastUpdatedAt]
  );

  return (
    <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2A44]">General Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure brand identity, contact details, homepage metadata, and system mode.
            </p>
          </div>
          {canEdit && (
          <Button
            type="button"
            onClick={saveSettings}
            disabled={disabled}
            className="h-10 rounded-lg px-4 bg-[#A68231] text-white hover:opacity-90"
          >
            {saving ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="Save" size={16} className="mr-2" />
                Save Settings
              </>
            )}
          </Button>
          )}
        </div>
      </div>

      {(error || success) && (
        <div className="px-5 pt-4">
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Site Name</label>
          <Input
            value={form.site_name}
            maxLength={255}
            onChange={(e) => updateField("site_name", e.target.value)}
            className={fieldClass}
            disabled={disabled}
            placeholder="Fayyaz Travels Admin"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Company Name</label>
          <Input
            value={form.company_name}
            maxLength={255}
            onChange={(e) => updateField("company_name", e.target.value)}
            className={fieldClass}
            disabled={disabled}
            placeholder="Fayyaz Travels"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Support Email</label>
          <Input
            type="email"
            value={form.support_email}
            maxLength={255}
            onChange={(e) => updateField("support_email", e.target.value)}
            className={fieldClass}
            disabled={disabled}
            placeholder="support@yourdomain.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Support Phone</label>
          <Input
            value={form.support_phone}
            maxLength={255}
            onChange={(e) => updateField("support_phone", e.target.value)}
            className={fieldClass}
            disabled={disabled}
            placeholder="+91 99999 99999"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Timezone</label>
          <Input
            value="SGT (Asia/Singapore)"
            className={fieldClass}
            disabled
            readOnly
          />
          <p className="text-xs text-gray-500">All dates and times use Singapore Standard Time only.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Homepage Title</label>
          <Input
            value={form.homepage_title}
            maxLength={255}
            onChange={(e) => updateField("homepage_title", e.target.value)}
            className={fieldClass}
            disabled={disabled}
            placeholder="Welcome to Fayyaz Travels"
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-gray-700">Office Address</label>
          <Textarea
            value={form.office_address}
            onChange={(e) => updateField("office_address", e.target.value)}
            className="min-h-[90px] rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus-visible:ring-[#A68231]/25 focus-visible:border-[#A68231]"
            disabled={disabled}
            placeholder="Enter office address..."
          />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-gray-700">Homepage Description</label>
          <Textarea
            value={form.homepage_description}
            maxLength={255}
            onChange={(e) => updateField("homepage_description", e.target.value)}
            className="min-h-[110px] rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus-visible:ring-[#A68231]/25 focus-visible:border-[#A68231]"
            disabled={disabled}
            placeholder="Describe your homepage meta description..."
          />
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#E8ECF0] bg-[#FAFBFC] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#1F2A44]">Maintenance Mode</p>
            <p className="text-xs text-gray-500 mt-1">
              Saved for the admin panel only. The public website does not read this flag.
            </p>
          </div>
          <Switch
            checked={form.maintenance_mode}
            onCheckedChange={(checked) => updateField("maintenance_mode", checked)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-gray-700">
            Supplier quote CC (management)
          </label>
          <Textarea
            value={form.quote_cc_emails}
            onChange={(e) => updateField("quote_cc_emails", e.target.value)}
            className="min-h-[80px] rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus-visible:ring-[#A68231]/25 focus-visible:border-[#A68231]"
            disabled={disabled}
            placeholder="ops@fayyaztravels.com, management@fayyaztravels.com"
          />
          <p className="text-xs text-gray-500">
            These addresses are automatically CC’d on every outgoing supplier quote email.
            Separate with commas or new lines.
          </p>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-gray-700">
            Supplier quote BCC (management)
          </label>
          <Textarea
            value={form.quote_bcc_emails}
            onChange={(e) => updateField("quote_bcc_emails", e.target.value)}
            className="min-h-[80px] rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus-visible:ring-[#A68231]/25 focus-visible:border-[#A68231]"
            disabled={disabled}
            placeholder="audit@fayyaztravels.com"
          />
          <p className="text-xs text-gray-500">
            These addresses are automatically BCC’d for quiet audit visibility on supplier quotes.
          </p>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[#E8ECF0] bg-[#FAFBFC] text-xs text-gray-500">
        {formattedUpdatedAt ? (
          <span>
            Last updated {formattedUpdatedAt}
            {lastUpdatedBy ? ` by ${lastUpdatedBy}` : ""}.
          </span>
        ) : (
          <span>No previous updates found.</span>
        )}
      </div>
    </div>
  );
}
