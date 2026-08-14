"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "../ui/icons";
import type { SupplierQuoteToolData } from "@/lib/package-types";
import type { SupplierPackageFile } from "@/lib/validation";
import {
  saveButtonLabel,
  stepPreviousButtonClass,
  stepSaveButtonClass,
  type StepFormBaseProps,
} from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getSettings } from "@/lib/settings-api";
import { sendSupplierQuoteEmail } from "@/lib/package-api";
import { isValidEmail, parseEmailList } from "@/lib/email-list";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  buildQuoteEmailBody,
  buildQuoteEmailSignature,
  buildQuoteEmailSubject,
  packageAttachmentFilename,
  stripQuoteEmailSignature,
} from "@/lib/supplier-quote-email";
import { formatPackageDateTime } from "@/lib/format-date";

interface SupplierSourceEmails {
  supplierName?: string;
  supplierPackageName?: string;
  contactPerson?: string;
  supplierEmails?: string[];
  quotationFiles?: SupplierPackageFile[];
}

interface SupplierQuoteToolProps extends StepFormBaseProps {
  onNext: (data: SupplierQuoteToolData) => void;
  onPrevious: () => void;
  initialData?: SupplierQuoteToolData | null;
  supplierSource?: SupplierSourceEmails | null;
  packageId?: number | null;
  packageTitle?: string;
  destination?: string;
}

type QuoteFormState = Required<
  Pick<
    SupplierQuoteToolData,
    | "quoteRequestType"
    | "supplierToSendTo"
    | "basedOnPackage"
    | "replyDeadline"
    | "clientTravelDates"
    | "adults"
    | "children"
    | "childrenAges"
    | "hotelPreference"
    | "rooming"
    | "mealRequirements"
    | "requestedChanges"
    | "negotiationNote"
    | "includeDayByDayItinerary"
    | "includeClientBudget"
    | "attachPackage"
  >
> & {
  toEmails: string[];
  additionalEmails: string[];
  emailSubject: string;
  emailBody: string;
  emailSignature: string;
};

function ToggleCard({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-[18px] transition-all duration-200 ease-in-out cursor-pointer select-none hover:border-gray-300"
      onClick={() => onChange(!active)}
    >
      <span className="text-sm font-bold text-[#1F2A44]">{label}</span>
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold ${active ? "text-[#16A34A]" : "text-[#64748B]"}`}
        >
          {active ? "Yes" : "No"}
        </span>
        <div
          role="switch"
          aria-checked={active}
          className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full flex-shrink-0 transition-colors duration-300 ease-in-out ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}
        >
          <span
            className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${active ? "translate-x-[23px]" : "translate-x-[3px]"}`}
          />
        </div>
      </div>
    </div>
  );
}

function supplierEmailsFromSource(source?: SupplierSourceEmails | null): string[] {
  return parseEmailList(source?.supplierEmails ?? []).filter(isValidEmail);
}

function buildInitialForm(
  initialData?: SupplierQuoteToolData | null,
  supplierSource?: SupplierSourceEmails | null,
  destination?: string,
  defaultSignature = ""
): QuoteFormState {
  const supplierEmails = supplierEmailsFromSource(supplierSource);
  const savedTo = (initialData?.toEmails ?? []).filter(isValidEmail);
  const toEmails = savedTo.length > 0 ? savedTo : supplierEmails;

  const base: QuoteFormState = {
    quoteRequestType: initialData?.quoteRequestType || "updated-rate",
    supplierToSendTo:
      initialData?.supplierToSendTo ||
      supplierSource?.supplierName ||
      supplierSource?.contactPerson ||
      "",
    basedOnPackage:
      initialData?.basedOnPackage || supplierSource?.supplierPackageName || "",
    replyDeadline: initialData?.replyDeadline || "",
    clientTravelDates: initialData?.clientTravelDates || "",
    adults: initialData?.adults || "",
    children: initialData?.children || "",
    childrenAges: initialData?.childrenAges || "",
    hotelPreference: initialData?.hotelPreference || "",
    rooming: initialData?.rooming || "",
    mealRequirements: initialData?.mealRequirements || "",
    requestedChanges: initialData?.requestedChanges || "",
    negotiationNote: initialData?.negotiationNote || "",
    includeDayByDayItinerary: initialData?.includeDayByDayItinerary ?? true,
    includeClientBudget: initialData?.includeClientBudget ?? false,
    attachPackage: initialData?.attachPackage ?? true,
    toEmails,
    additionalEmails: (initialData?.additionalEmails ?? []).filter(isValidEmail),
    emailSubject: "",
    emailBody: "",
    emailSignature: initialData?.emailSignature?.trim() || defaultSignature,
  };

  base.emailSubject =
    initialData?.emailSubject?.trim() || buildQuoteEmailSubject(base);
  base.emailBody =
    stripQuoteEmailSignature(initialData?.emailBody ?? "").trim() ||
    buildQuoteEmailBody(base, { destination });

  return base;
}

export default function SupplierQuoteTool({
  onNext,
  onPrevious,
  isSaving = false,
  initialData,
  supplierSource,
  packageId,
  packageTitle = "",
  destination = "",
}: SupplierQuoteToolProps) {
  const { user } = useAuth();
  const loginSignature = useMemo(
    () =>
      buildQuoteEmailSignature({
        name: user?.fullName,
        role: user?.role,
      }),
    [user?.fullName, user?.role]
  );
  const [formData, setFormData] = useState<QuoteFormState>(() =>
    buildInitialForm(initialData, supplierSource, destination, loginSignature)
  );
  const [bodyEdited, setBodyEdited] = useState(
    Boolean(stripQuoteEmailSignature(initialData?.emailBody ?? "").trim())
  );
  const [subjectEdited, setSubjectEdited] = useState(
    Boolean(initialData?.emailSubject?.trim())
  );
  const [signatureEdited, setSignatureEdited] = useState(
    Boolean(initialData?.emailSignature?.trim())
  );
  const [additionalDraft, setAdditionalDraft] = useState("");
  const [managementCc, setManagementCc] = useState<string[]>([]);
  const [managementBcc, setManagementBcc] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(initialData?.lastSentAt ?? "");
  const [lastSentBy, setLastSentBy] = useState(initialData?.lastSentBy ?? "");

  const sourceFiles = useMemo(
    () => supplierSource?.quotationFiles ?? [],
    [supplierSource]
  );
  const attachmentNames = useMemo(() => {
    if (sourceFiles.length > 0) {
      return sourceFiles.map((file) => file.filename);
    }
    return [
      packageAttachmentFilename(
        packageTitle || formData.basedOnPackage || "package-details"
      ),
    ];
  }, [sourceFiles, packageTitle, formData.basedOnPackage]);

  const supplierEmails = useMemo(
    () => supplierEmailsFromSource(supplierSource),
    [supplierSource]
  );

  useEffect(() => {
    setFormData(
      buildInitialForm(initialData, supplierSource, destination, loginSignature)
    );
    setBodyEdited(Boolean(stripQuoteEmailSignature(initialData?.emailBody ?? "").trim()));
    setSubjectEdited(Boolean(initialData?.emailSubject?.trim()));
    setSignatureEdited(Boolean(initialData?.emailSignature?.trim()));
    setLastSentAt(initialData?.lastSentAt ?? "");
    setLastSentBy(initialData?.lastSentBy ?? "");
    // loginSignature is applied separately so a late user load does not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [initialData, supplierSource, destination]);

  useEffect(() => {
    if (signatureEdited) return;
    if (!loginSignature) return;
    setFormData((prev) =>
      prev.emailSignature.trim() ? prev : { ...prev, emailSignature: loginSignature }
    );
  }, [loginSignature, signatureEdited]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { settings } = await getSettings();
        if (cancelled) return;
        setManagementCc(parseEmailList(settings.quote_cc_emails));
        setManagementBcc(parseEmailList(settings.quote_bcc_emails));
      } catch {
        // Settings may be unavailable; send still merges server-side.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const regeneratePreview = useCallback(
    (next: QuoteFormState, opts?: { forceSubject?: boolean; forceBody?: boolean }) => {
      setFormData({
        ...next,
        emailSubject:
          opts?.forceSubject || !subjectEdited
            ? buildQuoteEmailSubject(next)
            : next.emailSubject,
        emailBody:
          opts?.forceBody || !bodyEdited
            ? buildQuoteEmailBody(next, { destination })
            : next.emailBody,
      });
    },
    [bodyEdited, subjectEdited, destination]
  );

  const updateField = <K extends keyof QuoteFormState>(
    field: K,
    value: QuoteFormState[K]
  ) => {
    const next = { ...formData, [field]: value };
    if (
      field === "emailSubject" ||
      field === "emailBody" ||
      field === "emailSignature" ||
      field === "toEmails" ||
      field === "additionalEmails"
    ) {
      setFormData(next);
      return;
    }
    regeneratePreview(next);
  };

  const toggleSupplierEmail = (email: string) => {
    const normalized = email.toLowerCase();
    const selected = formData.toEmails.map((e) => e.toLowerCase());
    const nextTo = selected.includes(normalized)
      ? formData.toEmails.filter((e) => e.toLowerCase() !== normalized)
      : [...formData.toEmails, email];
    setFormData((prev) => ({ ...prev, toEmails: nextTo }));
  };

  const addAdditionalEmail = () => {
    const email = additionalDraft.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (
      formData.additionalEmails.some((e) => e.toLowerCase() === email) ||
      formData.toEmails.some((e) => e.toLowerCase() === email)
    ) {
      toast.error("That email is already in the recipient list");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      additionalEmails: [...prev.additionalEmails, email],
    }));
    setAdditionalDraft("");
  };

  const removeAdditionalEmail = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalEmails: prev.additionalEmails.filter(
        (e) => e.toLowerCase() !== email.toLowerCase()
      ),
    }));
  };

  const handleRegenerateClick = () => {
    setSubjectEdited(false);
    setBodyEdited(false);
    regeneratePreview(formData, { forceSubject: true, forceBody: true });
    toast.success("Email preview regenerated from form fields");
  };

  const toPayload = (): SupplierQuoteToolData => ({
    quoteRequestType: formData.quoteRequestType,
    supplierToSendTo: formData.supplierToSendTo,
    basedOnPackage: formData.basedOnPackage,
    replyDeadline: formData.replyDeadline,
    clientTravelDates: formData.clientTravelDates,
    adults: formData.adults,
    children: formData.children,
    childrenAges: formData.childrenAges,
    hotelPreference: formData.hotelPreference,
    rooming: formData.rooming,
    mealRequirements: formData.mealRequirements,
    requestedChanges: formData.requestedChanges,
    negotiationNote: formData.negotiationNote,
    includeDayByDayItinerary: formData.includeDayByDayItinerary,
    includeClientBudget: formData.includeClientBudget,
    attachPackage: formData.attachPackage,
    toEmails: formData.toEmails,
    additionalEmails: formData.additionalEmails,
    emailSubject: formData.emailSubject,
    emailBody: formData.emailBody,
    emailSignature: formData.emailSignature,
    lastSentAt: lastSentAt || undefined,
    lastSentBy: lastSentBy || null,
    lastSentTo: initialData?.lastSentTo,
  });

  const handleSubmit = () => {
    onNext(toPayload());
  };

  const handleSend = async () => {
    if (!packageId) {
      toast.error("Save the package first, then send the quote email");
      return;
    }

    const to = formData.toEmails.filter(isValidEmail);
    const additionalTo = formData.additionalEmails.filter(isValidEmail);
    if (to.length + additionalTo.length === 0) {
      toast.error("Select or add at least one recipient email");
      return;
    }
    if (!formData.emailSubject.trim() || !formData.emailBody.trim()) {
      toast.error("Subject and email body are required");
      return;
    }

    setSending(true);
    try {
      const result = await sendSupplierQuoteEmail(packageId, {
        to,
        additionalTo,
        subject: formData.emailSubject.trim(),
        body: formData.emailBody.trim(),
        emailSignature: formData.emailSignature,
        quoteData: toPayload() as unknown as Record<string, unknown>,
      });

      if (result.package?.supplier_quote_tool) {
        const sent = result.package.supplier_quote_tool;
        setFormData(
          buildInitialForm(sent, supplierSource, destination, loginSignature)
        );
        setSignatureEdited(Boolean(sent.emailSignature?.trim()));
        setLastSentAt(sent.lastSentAt ?? "");
        setLastSentBy(sent.lastSentBy ?? "");
      }

      const ccNote =
        result.recipients.cc.length > 0
          ? ` CC: ${result.recipients.cc.join(", ")}`
          : "";
      const bccNote =
        result.recipients.bcc.length > 0
          ? ` BCC: ${result.recipients.bcc.join(", ")}`
          : "";
      const attachNote =
        result.attachments && result.attachments.length > 0
          ? ` Attached: ${result.attachments.join(", ")}`
          : "";
      if (result.mode === "ethereal" && result.previewUrl) {
        toast.success(
          `Quote email captured (dev preview).${ccNote}${bccNote}${attachNote}`,
          {
            description: "Open preview to view the message — not delivered to a real inbox.",
            action: {
              label: "Open preview",
              onClick: () => window.open(result.previewUrl, "_blank", "noopener,noreferrer"),
            },
            duration: 12_000,
          }
        );
      } else if (result.mode === "graph") {
        toast.success(`Quote email sent.${ccNote}${bccNote}${attachNote}`, {
          description: "Delivered via Microsoft Graph.",
        });
      } else {
        toast.success(`Quote email sent.${ccNote}${bccNote}${attachNote}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10`;
  const labelClass = "block text-sm font-bold text-[#1F2A44] mb-2";
  const textareaClass =
    "w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in relative">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <h2 className="text-lg font-bold text-[#1F2A44]">Supplier Quote Tool</h2>
        <p className="text-sm text-gray-400 mt-1">
          Consultants can send the package to a supplier without exposing Fayyaz
          pricing or internal notes.
        </p>
      </div>

      <div className="p-6 pb-0">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <Label htmlFor="quoteRequestType" className={labelClass}>
                  Quote request type
                </Label>
                <NativeSelect
                  id="quoteRequestType"
                  className={selectClass}
                  value={formData.quoteRequestType}
                  onChange={(e) => updateField("quoteRequestType", e.target.value)}
                >
                  <option value="updated-rate">Updated rate request</option>
                  <option value="new-enquiry">New client enquiry</option>
                  <option value="amendment">Amendment request</option>
                  <option value="reconfirmation">Reconfirmation</option>
                </NativeSelect>
              </div>

              <div>
                <Label htmlFor="supplierToSendTo" className={labelClass}>
                  Supplier to send to
                </Label>
                <Input
                  id="supplierToSendTo"
                  type="text"
                  placeholder="Supplier name or contact"
                  className={inputClass}
                  value={formData.supplierToSendTo}
                  onChange={(e) => updateField("supplierToSendTo", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="basedOnPackage" className={labelClass}>
                  Based on supplier package
                </Label>
                <Input
                  id="basedOnPackage"
                  type="text"
                  placeholder="Package name or reference"
                  className={inputClass}
                  value={formData.basedOnPackage}
                  onChange={(e) => updateField("basedOnPackage", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="replyDeadline" className={labelClass}>
                  Reply deadline
                </Label>
                <div className="relative">
                  <Input
                    id="replyDeadline"
                    type="date"
                    className={`${inputClass} pl-10`}
                    value={formData.replyDeadline}
                    onChange={(e) => updateField("replyDeadline", e.target.value)}
                  />
                  <Icon
                    name="Calendar"
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clientTravelDates" className={labelClass}>
                  Client travel dates
                </Label>
                <Input
                  id="clientTravelDates"
                  type="text"
                  placeholder="e.g. 15–22 Aug 2026"
                  className={inputClass}
                  value={formData.clientTravelDates}
                  onChange={(e) => updateField("clientTravelDates", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="adults" className={labelClass}>
                  Adults
                </Label>
                <Input
                  id="adults"
                  type="number"
                  min="0"
                  placeholder="2"
                  className={inputClass}
                  value={formData.adults}
                  onChange={(e) => updateField("adults", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="children" className={labelClass}>
                  Children
                </Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  placeholder="0"
                  className={inputClass}
                  value={formData.children}
                  onChange={(e) => updateField("children", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="childrenAges" className={labelClass}>
                  Children&apos;s ages
                </Label>
                <Input
                  id="childrenAges"
                  type="text"
                  placeholder="e.g. 6, 9"
                  className={inputClass}
                  value={formData.childrenAges}
                  onChange={(e) => updateField("childrenAges", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="hotelPreference" className={labelClass}>
                  Hotel preference
                </Label>
                <Input
                  id="hotelPreference"
                  type="text"
                  placeholder="e.g. 4-star central"
                  className={inputClass}
                  value={formData.hotelPreference}
                  onChange={(e) => updateField("hotelPreference", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="rooming" className={labelClass}>
                  Rooming
                </Label>
                <Input
                  id="rooming"
                  type="text"
                  placeholder="e.g. 1 double + 1 twin"
                  className={inputClass}
                  value={formData.rooming}
                  onChange={(e) => updateField("rooming", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
              <div>
                <Label htmlFor="mealRequirements" className={labelClass}>
                  Meal requirements
                </Label>
                <Input
                  id="mealRequirements"
                  type="text"
                  placeholder="e.g. Halal where possible"
                  className={inputClass}
                  value={formData.mealRequirements}
                  onChange={(e) => updateField("mealRequirements", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="requestedChanges" className={labelClass}>
                  Requested changes
                </Label>
                <Textarea
                  id="requestedChanges"
                  placeholder="List any changes from the base package..."
                  rows={3}
                  className={textareaClass}
                  value={formData.requestedChanges}
                  onChange={(e) => updateField("requestedChanges", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="negotiationNote" className={labelClass}>
                Negotiation note
              </Label>
              <Textarea
                id="negotiationNote"
                placeholder="Example: client is serious but price-sensitive. Ask for best net rate before markup."
                rows={4}
                className={textareaClass}
                value={formData.negotiationNote}
                onChange={(e) => updateField("negotiationNote", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
              <ToggleCard
                label="Include day-by-day itinerary"
                active={formData.includeDayByDayItinerary}
                onChange={(value) => updateField("includeDayByDayItinerary", value)}
              />
              <ToggleCard
                label="Include client budget"
                active={formData.includeClientBudget}
                onChange={(value) => updateField("includeClientBudget", value)}
              />
              <ToggleCard
                label="Package attachment"
                active={formData.attachPackage}
                onChange={(value) => updateField("attachPackage", value)}
              />
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Attaches the quotation, brochure, or rate sheet uploaded in Supplier
              Source (Step 1). If no file is saved there, a package summary is
              attached instead.
            </p>

            <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F2A44]">Email recipients</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Supplier emails are pulled from Step 1 (Supplier Source). Add extra
                  recipients if needed. Management CC/BCC is applied automatically.
                </p>
              </div>

              <div>
                <p className={`${labelClass} mb-2`}>From supplier module</p>
                {supplierEmails.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    No supplier emails found. Add them in Supplier Source (Step 1), or
                    enter recipients manually below.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {supplierEmails.map((email) => {
                      const checked = formData.toEmails.some(
                        (e) => e.toLowerCase() === email.toLowerCase()
                      );
                      return (
                        <li key={email}>
                          <label className="flex items-center gap-3 text-sm text-[#1F2A44] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 cursor-pointer hover:border-gray-300">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#B48A2C]"
                              checked={checked}
                              onChange={() => toggleSupplierEmail(email)}
                            />
                            <span>{email}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <Label htmlFor="additionalEmail" className={labelClass}>
                  Additional recipients
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="additionalEmail"
                    type="email"
                    placeholder="ops@partner.com"
                    className={inputClass}
                    value={additionalDraft}
                    onChange={(e) => setAdditionalDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAdditionalEmail();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addAdditionalEmail}
                    className="h-12 px-4 rounded-[12px] bg-[#1F2A44] text-white hover:bg-[#1F2A44]/90"
                  >
                    Add
                  </Button>
                </div>
                {formData.additionalEmails.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {formData.additionalEmails.map((email) => (
                      <li
                        key={email}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E5E7EB] px-3 py-1 text-xs text-[#1F2A44]"
                      >
                        {email}
                        <button
                          type="button"
                          aria-label={`Remove ${email}`}
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => removeAdditionalEmail(email)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2.5">
                  <p className="font-semibold text-[#1F2A44]">Auto CC (management)</p>
                  <p className="text-gray-500 mt-1 break-words">
                    {managementCc.length > 0 ? managementCc.join(", ") : "Not configured"}
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2.5">
                  <p className="font-semibold text-[#1F2A44]">Auto BCC (management)</p>
                  <p className="text-gray-500 mt-1 break-words">
                    {managementBcc.length > 0
                      ? managementBcc.join(", ")
                      : "Not configured"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-20 self-start">
            <div className="bg-[#EBF4FF] rounded-[12px] p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1F2A44]">
                    Editable email preview
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Edit subject, body, and signature before sending.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateClick}
                  className="h-8 text-xs rounded-lg border-[#BFDBFE] bg-white"
                >
                  Regenerate
                </Button>
              </div>

              <div>
                <Label htmlFor="emailSubject" className="text-xs font-semibold text-[#1F2A44]">
                  Subject
                </Label>
                <Input
                  id="emailSubject"
                  className="mt-1 h-10 rounded-lg bg-white border-[#E5E7EB] text-sm"
                  value={formData.emailSubject}
                  onChange={(e) => {
                    setSubjectEdited(true);
                    updateField("emailSubject", e.target.value);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="emailBody" className="text-xs font-semibold text-[#1F2A44]">
                  Body
                </Label>
                <Textarea
                  id="emailBody"
                  rows={16}
                  className="mt-1 min-h-[280px] rounded-lg bg-white border-[#E5E7EB] text-sm font-mono leading-relaxed"
                  value={formData.emailBody}
                  onChange={(e) => {
                    setBodyEdited(true);
                    updateField("emailBody", e.target.value);
                  }}
                />
                <div className="mt-2 rounded-lg border border-[#BFDBFE] bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="emailSignature"
                      className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
                    >
                      Email signature
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSignatureEdited(false);
                        updateField("emailSignature", loginSignature);
                        toast.success("Signature reset to your login details");
                      }}
                      className="h-7 px-2 text-[11px] rounded-md border-[#BFDBFE] bg-white"
                    >
                      Use login details
                    </Button>
                  </div>
                  <Textarea
                    id="emailSignature"
                    rows={4}
                    className="mt-1.5 min-h-[88px] rounded-lg bg-white border-[#E5E7EB] text-sm font-mono leading-relaxed"
                    value={formData.emailSignature}
                    onChange={(e) => {
                      setSignatureEdited(true);
                      updateField("emailSignature", e.target.value);
                    }}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    Filled from your login. Edit it if you want a different name or title.
                  </p>
                </div>
              </div>

              {formData.attachPackage && (
                <div className="rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-xs text-[#1F2A44] space-y-1.5">
                  {sourceFiles.length === 0 ? (
                    <p className="text-amber-700">
                      No package file in Supplier Source. A generated summary will be attached. Upload the file in Step 1 to send the original document.
                    </p>
                  ) : (
                    attachmentNames.map((name) => (
                      <div key={name} className="flex items-center gap-2">
                        <Icon name="FileText" size={14} className="text-[#B48A2C] shrink-0" />
                        <span className="truncate">
                          Will attach <strong>{name}</strong>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {lastSentAt && (
                <p className="text-xs text-gray-500">
                  Last sent {formatPackageDateTime(lastSentAt)}
                  {lastSentBy ? ` by ${lastSentBy}` : ""}.
                </p>
              )}

              <Button
                type="button"
                onClick={handleSend}
                disabled={sending || isSaving}
                className="w-full h-12 text-sm font-bold text-white uppercase tracking-wide bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send quote email"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex items-center justify-between flex-wrap gap-3 rounded-b-[12px] z-10 mt-6">
        <p className="text-xs text-gray-400">
          Save draft to keep recipients and email content with this package.
        </p>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
            <Icon name="ChevronLeft" size={16} />
            Back
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            data-package-step-save="" className={stepSaveButtonClass}
          >
            {saveButtonLabel(isSaving)}
            <span className="text-base leading-none">→</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
