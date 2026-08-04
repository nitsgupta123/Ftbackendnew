"use client";

import { Icon } from "@/components/ui/icons";
import type { EnquiryRecord } from "@/lib/enquiry-types";
import {
  enquiryDisplayName,
  enquiryTypeLabel,
  isEnquiryOpen,
} from "@/lib/enquiry-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";

interface EnquiryDetailsModalProps {
  enquiry: EnquiryRecord | null;
  onClose: () => void;
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-gray-900 break-words">{value}</dd>
    </div>
  );
}

export default function EnquiryDetailsModal({
  enquiry,
  onClose,
}: EnquiryDetailsModalProps) {
  if (!enquiry) return null;

  const open = isEnquiryOpen(enquiry.status);
  const phone = [enquiry.countryCode, enquiry.phone]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  const travellers = [
    enquiry.adults && Number(enquiry.adults) > 0
      ? `${enquiry.adults} adults`
      : null,
    enquiry.youngAdults && Number(enquiry.youngAdults) > 0
      ? `${enquiry.youngAdults} young adults`
      : null,
    enquiry.children && Number(enquiry.children) > 0
      ? `${enquiry.children} children`
      : null,
    enquiry.infants && Number(enquiry.infants) > 0
      ? `${enquiry.infants} infants`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB]">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white z-10">
          <div className="pr-4 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {enquiryDisplayName(enquiry)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enquiry #{enquiry.id} · {enquiryTypeLabel(enquiry.messageType)}
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                open
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {open ? "Open" : "Closed"}
            </span>
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {enquiryTypeLabel(enquiry.messageType)}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DetailItem label="Title" value={displayValue(enquiry.title)} />
            <DetailItem label="Company" value={displayValue(enquiry.company)} />
            <DetailItem label="Email" value={displayValue(enquiry.email)} />
            <DetailItem label="Phone" value={displayValue(phone)} />
            <DetailItem
              label="Location"
              value={displayValue(enquiry.location)}
            />
            <DetailItem
              label="Services"
              value={displayValue(enquiry.services)}
            />
            <DetailItem
              label="Origin"
              value={displayValue(enquiry.originName || enquiry.origin)}
            />
            <DetailItem
              label="Destination"
              value={displayValue(
                enquiry.destinationName || enquiry.destination
              )}
            />
            <DetailItem
              label="Departure"
              value={displayValue(enquiry.departureDate)}
            />
            <DetailItem
              label="Return"
              value={displayValue(enquiry.returnDate)}
            />
            <DetailItem
              label="Budget"
              value={
                enquiry.budget.trim()
                  ? `${enquiry.currency ? `${enquiry.currency} ` : ""}${enquiry.budget}`
                  : "—"
              }
            />
            <DetailItem
              label="Travellers"
              value={travellers || "—"}
            />
            <DetailItem
              label="Received"
              value={formatPackageDateTime(enquiry.insertDate)}
            />
            <DetailItem
              label="Updated"
              value={formatPackageDateTime(enquiry.editDate)}
            />
            <DetailItem
              label="How they found us"
              value={displayValue(enquiry.aboutUs)}
            />
            <DetailItem
              label="Browser"
              value={displayValue(enquiry.systemInfo)}
            />
          </dl>

          {enquiry.message.trim() ? (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">
                Message
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-xl border border-[#E5E7EB] bg-gray-50 p-4">
                {enquiry.message}
              </p>
            </div>
          ) : null}

          {enquiry.pageUrl.trim() ? (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">
                Source URL
              </h3>
              <a
                href={enquiry.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#A68231] hover:underline break-all"
              >
                {enquiry.pageUrl}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
