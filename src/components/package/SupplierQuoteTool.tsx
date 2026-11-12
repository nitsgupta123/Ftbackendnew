"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Icon } from "../ui/icons";
import type { PackageRecord, SupplierQuoteToolData } from "@/lib/package-types";
import { normalizeSupplierFormValues, type SupplierPackageFile } from "@/lib/validation";
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
import { listSupplierModuleEmails, sendSupplierQuoteEmail } from "@/lib/package-api";
import { buildQuoteRecipients, type QuoteRecipientOption } from "@/lib/package-content";
import { isValidEmail, parseEmailList } from "@/lib/email-list";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  applyReferenceCodeToSubject,
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
  onSent?: (pkg: PackageRecord) => void;
}

type QuoteFormState = Required<
  Pick<
    SupplierQuoteToolData,
    | "quoteRequestType"
    | "referenceCode"
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

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-[#E5E7EB] pb-3">
        <h3 className="text-sm font-bold tracking-wide text-[#1F2A44]">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

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
    <button
      type="button"
      onClick={() => onChange(!active)}
      className="flex w-full items-center justify-between gap-4 rounded-[12px] border border-[#E5E7EB] bg-white px-4 py-3.5 text-left transition-colors hover:border-gray-300"
    >
      <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#1F2A44]">
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span
          className={`w-7 text-right text-xs font-semibold ${active ? "text-[#16A34A]" : "text-[#64748B]"}`}
        >
          {active ? "Yes" : "No"}
        </span>
        <span
          role="switch"
          aria-checked={active}
          className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full transition-colors duration-300 ease-in-out ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}
        >
          <span
            className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${active ? "translate-x-[23px]" : "translate-x-[3px]"}`}
          />
        </span>
      </span>
    </button>
  );
}

function supplierEmailsFromSource(source?: SupplierSourceEmails | null): string[] {
  const normalized = normalizeSupplierFormValues(source);
  return parseEmailList(normalized.supplierEmails).filter(isValidEmail);
}

function preferredRecipientEmails(
  options: QuoteRecipientOption[],
  supplierName: string
): string[] {
  const name = supplierName.trim().toLowerCase();
  return options
    .filter((recipient) => {
      if (recipient.sources.includes("supplier_source")) return true;
      if (!name || !recipient.supplierName) return false;
      return recipient.supplierName
        .split(", ")
        .some((part) => part.trim().toLowerCase() === name);
    })
    .map((recipient) => recipient.email);
}

function recipientSourceLabel(recipient: QuoteRecipientOption): string {
  return [
    recipient.sources.includes("supplier_source") ? "Supplier Source" : "",
    recipient.sources.includes("supplier_module") ? "Supplier Module" : "",
    recipient.sources.length === 0 ? "Previously selected" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function recipientCaution(recipient: QuoteRecipientOption): string {
  return [
    recipient.supplierStatus === "do_not_use" ? "Do not use" : "",
    recipient.relationshipStatus === "blacklisted" ? "Blacklisted" : "",
  ]
    .filter(Boolean)
    .join(" · ");
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
    referenceCode: initialData?.referenceCode || "",
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
  onSent,
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
  const [moduleRecipients, setModuleRecipients] = useState<QuoteRecipientOption[]>([]);
  const [moduleEmailsLoaded, setModuleEmailsLoaded] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const recipientsTouched = useRef(Boolean(initialData?.toEmails?.length));

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
  const recipientOptions = useMemo(
    () =>
      buildQuoteRecipients({
        sourceEmails: supplierEmails,
        moduleSuppliers: moduleRecipients.map((recipient) => ({
          company_name: recipient.supplierName,
          email_address: recipient.email,
          status: recipient.supplierStatus,
          relationship_status: recipient.relationshipStatus,
        })),
      }),
    [supplierEmails, moduleRecipients]
  );
  const listedRecipients = useMemo(() => {
    const known = new Set(recipientOptions.map((recipient) => recipient.email));
    const savedOnly: QuoteRecipientOption[] = formData.toEmails
      .map((email) => email.trim().toLowerCase())
      .filter((email) => isValidEmail(email) && !known.has(email))
      .map((email) => ({ email, sources: [] }));
    return [...recipientOptions, ...savedOnly];
  }, [recipientOptions, formData.toEmails]);
  const visibleRecipients = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) return listedRecipients;
    return listedRecipients.filter((recipient) =>
      `${recipient.email} ${recipient.supplierName ?? ""}`.toLowerCase().includes(query)
    );
  }, [listedRecipients, recipientQuery]);
  const sourceRecipientCount = recipientOptions.filter((recipient) =>
    recipient.sources.includes("supplier_source")
  ).length;
  const moduleRecipientCount = recipientOptions.filter((recipient) =>
    recipient.sources.includes("supplier_module")
  ).length;

  useEffect(() => {
    setFormData(
      buildInitialForm(initialData, supplierSource, destination, loginSignature)
    );
    setBodyEdited(Boolean(stripQuoteEmailSignature(initialData?.emailBody ?? "").trim()));
    setSubjectEdited(Boolean(initialData?.emailSubject?.trim()));
    setSignatureEdited(Boolean(initialData?.emailSignature?.trim()));
    setLastSentAt(initialData?.lastSentAt ?? "");
    setLastSentBy(initialData?.lastSentBy ?? "");
    recipientsTouched.current = Boolean(initialData?.toEmails?.length);
    // loginSignature is applied separately so a late user load does not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [initialData, supplierSource, destination]);

  useEffect(() => {
    let cancelled = false;
    void listSupplierModuleEmails()
      .then((result) => {
        if (cancelled) return;
        setModuleRecipients(
          result.recipients.map((recipient) => ({
            email: recipient.email,
            sources: ["supplier_module"],
            supplierName: recipient.supplierName,
            supplierStatus: recipient.supplierStatus,
            relationshipStatus: recipient.relationshipStatus,
          }))
        );
        setModuleEmailsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setModuleRecipients([]);
        setModuleEmailsLoaded(true);
        toast.error("Could not load Supplier Module emails");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (recipientsTouched.current) return;
    const next = preferredRecipientEmails(
      recipientOptions,
      supplierSource?.supplierName ?? ""
    );
    setFormData((prev) => {
      const same =
        prev.toEmails.length === next.length &&
        prev.toEmails.every((email, index) => email.toLowerCase() === next[index]);
      if (same) return prev;
      return { ...prev, toEmails: next };
    });
  }, [recipientOptions, supplierSource?.supplierName]);

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
    recipientsTouched.current = true;
    const normalized = email.toLowerCase();
    const selected = formData.toEmails.map((e) => e.toLowerCase());
    const nextTo = selected.includes(normalized)
      ? formData.toEmails.filter((e) => e.toLowerCase() !== normalized)
      : [...formData.toEmails, email];
    setFormData((prev) => ({ ...prev, toEmails: nextTo }));
  };

  const setShownRecipients = (selected: boolean) => {
    recipientsTouched.current = true;
    const shown = new Set(visibleRecipients.map((recipient) => recipient.email));
    setFormData((prev) => {
      const kept = prev.toEmails.filter((email) => !shown.has(email.toLowerCase()));
      if (!selected) return { ...prev, toEmails: kept };
      const next = [...kept];
      for (const recipient of visibleRecipients) {
        if (!next.some((email) => email.toLowerCase() === recipient.email)) {
          next.push(recipient.email);
        }
      }
      return { ...prev, toEmails: next };
    });
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
    referenceCode: formData.referenceCode.trim(),
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
    const referenceCode = formData.referenceCode.trim();
    if (!referenceCode) {
      toast.error("Add your reference code so it appears in the subject line");
      return;
    }
    if (!formData.emailSubject.trim() || !formData.emailBody.trim()) {
      toast.error("Subject and email body are required");
      return;
    }

    const subject = applyReferenceCodeToSubject(formData.emailSubject, referenceCode);
    if (subject !== formData.emailSubject) {
      setFormData((prev) => ({ ...prev, emailSubject: subject, referenceCode }));
    }

    setSending(true);
    try {
      const result = await sendSupplierQuoteEmail(packageId, {
        to,
        additionalTo,
        subject,
        body: formData.emailBody.trim(),
        emailSignature: formData.emailSignature,
        quoteData: {
          ...(toPayload() as unknown as Record<string, unknown>),
          referenceCode,
          emailSubject: subject,
        },
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
      if (result.package) onSent?.(result.package);

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

      <div className="space-y-8 p-6 pb-2">
        <FormSection
          title="Request"
          description="Who this quote is for, and when you need a reply."
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="referenceCode" className={labelClass}>
                Your reference code
              </Label>
              <Input
                id="referenceCode"
                type="text"
                placeholder="e.g. TC-1042"
                className={inputClass}
                value={formData.referenceCode}
                onChange={(e) => updateField("referenceCode", e.target.value)}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Required. This is added to the supplier email subject so replies come back to you.
              </p>
            </div>

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
          </div>
        </FormSection>

        <FormSection
          title="Trip"
          description="Travel dates, party size, and stay preferences."
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
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
          </div>
        </FormSection>

        <FormSection
          title="Notes"
          description="Changes from the base package, and anything the supplier should know before quoting."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <Label htmlFor="requestedChanges" className={labelClass}>
                  Requested changes
                </Label>
                <Textarea
                  id="requestedChanges"
                  placeholder="List any changes from the base package..."
                  rows={4}
                  className={textareaClass}
                  value={formData.requestedChanges}
                  onChange={(e) => updateField("requestedChanges", e.target.value)}
                />
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
          </div>
        </FormSection>

        <FormSection
          title="Include in the email"
          description="Choose what the supplier receives with this quote."
        >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
            <p className="text-xs leading-relaxed text-gray-500">
              The package attachment uses the quotation, brochure, or rate sheet uploaded
              in Supplier Source. If no file is saved there, a package summary is attached
              instead.
            </p>
        </FormSection>

        <FormSection
          title="Recipients"
          description="Every address saved on this package’s Supplier Source, and every address saved in the Supplier Module. Select or deselect each recipient. Management CC and BCC are applied automatically."
        >
            <div className="grid grid-cols-1 items-start gap-5 rounded-[12px] border border-[#E5E7EB] bg-[#FAFBFC] p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.75fr)]">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className={labelClass}>Saved supplier emails</p>
                    <p className="text-xs text-gray-500 -mt-1">
                      {sourceRecipientCount} from Supplier Source · {moduleRecipientCount} from
                      Supplier Module
                      {listedRecipients.length > 0
                        ? ` · ${formData.toEmails.length} selected`
                        : ""}
                    </p>
                  </div>
                  {listedRecipients.length > 0 && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#1F2A44] underline underline-offset-2"
                        onClick={() => setShownRecipients(true)}
                      >
                        {recipientQuery.trim() ? "Select shown" : "Select all"}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#64748B] underline underline-offset-2"
                        onClick={() => setShownRecipients(false)}
                      >
                        {recipientQuery.trim() ? "Deselect shown" : "Deselect all"}
                      </button>
                    </div>
                  )}
                </div>
                {listedRecipients.length > 4 && (
                  <Input
                    type="search"
                    placeholder="Search by email or supplier"
                    className={`${inputClass} mb-2`}
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    aria-label="Search saved supplier emails"
                  />
                )}
                {!moduleEmailsLoaded && listedRecipients.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">
                    Loading saved supplier emails…
                  </p>
                ) : listedRecipients.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    No saved supplier emails found. Add them in Supplier Source or the
                    Supplier Module, or enter recipients manually below.
                  </p>
                ) : visibleRecipients.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">
                    No saved emails match that search.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {visibleRecipients.map((recipient) => {
                      const checked = formData.toEmails.some(
                        (email) => email.toLowerCase() === recipient.email
                      );
                      const caution = recipientCaution(recipient);
                      return (
                        <li key={recipient.email}>
                          <label className="flex items-center gap-3 text-sm text-[#1F2A44] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 cursor-pointer hover:border-gray-300">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#B48A2C]"
                              checked={checked}
                              onChange={() => toggleSupplierEmail(recipient.email)}
                            />
                            <span className="min-w-0">
                              <span className="block break-all">{recipient.email}</span>
                              <span className="block text-xs text-gray-500">
                                {recipientSourceLabel(recipient)}
                                {recipient.supplierName ? ` · ${recipient.supplierName}` : ""}
                                {caution ? (
                                  <span className="text-amber-700"> · {caution}</span>
                                ) : null}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-4">
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

              <div className="grid grid-cols-1 gap-3 text-xs">
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
        </FormSection>

        <FormSection
          title="Email"
          description="Your reference code is included in the subject. Edit the subject, body, and signature before sending."
        >
            <div className="space-y-4 rounded-[12px] border border-[#D6E6FA] bg-[#F4F8FF] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateClick}
                  className="h-10 shrink-0 rounded-lg border-[#BFDBFE] bg-white px-4 text-xs"
                >
                  Regenerate
                </Button>
              </div>

              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.7fr)]">
              <div>
                <Label htmlFor="emailBody" className="text-xs font-semibold text-[#1F2A44]">
                  Body
                </Label>
                <Textarea
                  id="emailBody"
                  rows={14}
                  className="mt-1 min-h-[280px] rounded-lg bg-white border-[#E5E7EB] text-sm leading-relaxed"
                  value={formData.emailBody}
                  onChange={(e) => {
                    setBodyEdited(true);
                    updateField("emailBody", e.target.value);
                  }}
                />
              </div>
                <div className="rounded-lg border border-[#D6E6FA] bg-white px-3 py-2.5">
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
                    className="mt-1.5 min-h-[180px] rounded-lg bg-white border-[#E5E7EB] text-sm leading-relaxed"
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

              <div className="flex flex-col gap-3 border-t border-[#D6E6FA] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  {lastSentAt
                    ? `Last sent ${formatPackageDateTime(lastSentAt)}${lastSentBy ? ` by ${lastSentBy}` : ""}.`
                    : "This quote has not been sent yet."}
                </p>
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || isSaving}
                  className="h-11 px-6 text-sm font-bold text-white uppercase tracking-wide bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors shadow-sm disabled:opacity-60 sm:w-auto"
                >
                  {sending ? "Sending..." : "Send quote email"}
                </Button>
              </div>
            </div>
        </FormSection>
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
