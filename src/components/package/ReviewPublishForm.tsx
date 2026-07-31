"use client";

import { useEffect, useState } from "react";
import { Icon } from "../ui/icons";

import type { ReviewPublishData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";import { Label } from "@/components/ui/label";import { Input } from "@/components/ui/input";import { Textarea } from "@/components/ui/textarea";import { Button } from "@/components/ui/button";

interface ReviewPublishFormProps extends StepFormBaseProps {
  onNext: (data: ReviewPublishData) => void;
  onPrevious: () => void;
  initialData?: ReviewPublishData | null;
}

type SectionStatus = "complete" | "warning";

interface SectionCard {
  title: string;
  owner?: string;
  lastEdited?: string;
  description?: string;
  status: SectionStatus;
}

interface HealthCheckItem {
  title: string;
  description: string;
  status: SectionStatus;
}

interface SignOffItem {
  stage: string;
  responsible: string;
  lastAction: string;
  badge: string;
  badgeStyle: "ready" | "needs" | "draft" | "blocked";
}

const HEALTH_CHECKS: HealthCheckItem[] = [
{
  title: "Images",
  description: "Hero image source and alt text required",
  status: "warning"
},
{
  title: "Pricing",
  description:
  "Check supplier net, exchange rate, markup, promo and pax tier pricing",
  status: "warning"
},
{
  title: "SEO",
  description: "SEO team sign-off required",
  status: "warning"
},
{
  title: "Supplier contacts",
  description: "Supplier name and contact emails recorded",
  status: "complete"
}];


const SECTION_CARDS: SectionCard[] = [
{
  title: "Permissions",
  description: "SEO approval limited to users with SEO access",
  status: "complete"
},
{
  title: "Promotion",
  description: "Slashed rates require promo start, end and approval",
  status: "warning"
},
{
  title: "Supplier Source",
  owner: "Product",
  lastEdited: "Current user",
  status: "complete"
},
{
  title: "Package Basics",
  owner: "Product",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Media & Front-End",
  owner: "Product + Marketing",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Pricing",
  owner: "Product + Finance",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Itinerary",
  owner: "Product",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Hotels",
  owner: "Product + Ops",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Inclusions",
  owner: "Product",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Booking Policy",
  owner: "Ops + Finance",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Consultant View",
  owner: "Sales Lead",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Supplier Quote Tool",
  owner: "Consultants",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Front-End FAQs",
  owner: "Product + SEO",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "Sales & Ads Assets",
  owner: "Marketing + Sales",
  lastEdited: "Not started",
  status: "warning"
},
{
  title: "SEO",
  owner: "SEO Team",
  lastEdited: "Not started",
  status: "warning"
}];


const SIGN_OFF_TRAIL: SignOffItem[] = [
{
  stage: "Supplier Source",
  responsible: "Product",
  lastAction: "Last edited by User A",
  badge: "Ready",
  badgeStyle: "ready"
},
{
  stage: "Media & Front-End",
  responsible: "Product + Marketing",
  lastAction: "Last edited by User B",
  badge: "Needs image source",
  badgeStyle: "needs"
},
{
  stage: "SEO",
  responsible: "SEO Team",
  lastAction: "Not reviewed",
  badge: "Draft",
  badgeStyle: "draft"
},
{
  stage: "Final Approval",
  responsible: "Admin",
  lastAction: "Pending",
  badge: "Blocked",
  badgeStyle: "blocked"
}];


const ACTIVITY_LOG = [
{
  dateTime: "Auto timestamp",
  user: "Current user",
  section: "Pricing",
  change: "Updated supplier net and markup tiers"
},
{
  dateTime: "Auto timestamp",
  user: "Current user",
  section: "Media",
  change: "Added hero image placeholder"
}];


const WORKFLOW_STEPS = [
"Submit for review",
"Product review",
"SEO review",
"Ops and finance check",
"Final approval and publish"];


const BADGE_STYLES: Record<SignOffItem["badgeStyle"], string> = {
  ready: "bg-[#DCFCE7] text-[#166534]",
  needs: "bg-[#FEF3C7] text-[#92400E]",
  draft: "bg-[#F1F5F9] text-[#475569]",
  blocked: "bg-[#FEE2E2] text-[#991B1B]"
};

function StatusIcon({ status }: {status: SectionStatus;}) {
  if (status === "complete") {
    return (
      <div className="w-7 h-7 rounded-[6px] bg-[#10B981] flex items-center justify-center flex-shrink-0">
        <Icon name="Check" size={14} className="text-white" />
      </div>);

  }

  return (
    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
      <Icon name="AlertTriangle" size={22} className="text-[#F59E0B] fill-[#F59E0B]/20" />
    </div>);

}

function SectionStatusCard({ card }: {card: SectionCard;}) {
  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-[#1F2A44]">{card.title}</h4>
        {card.description ?
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            {card.description}
          </p> :

        <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-400">Owner: {card.owner}</p>
            <p className="text-xs text-gray-400">
              Last edited by: {card.lastEdited}
            </p>
          </div>
        }
      </div>
      <StatusIcon status={card.status} />
    </div>);

}

export default function ReviewPublishForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false
}: ReviewPublishFormProps) {
  const [productReviewer, setProductReviewer] = useState(
    initialData?.productReviewer ?? ""
  );
  const [seoReviewer, setSeoReviewer] = useState(initialData?.seoReviewer ?? "");
  const [opsReviewer, setOpsReviewer] = useState(initialData?.opsReviewer ?? "");
  const [finalApprover, setFinalApprover] = useState(initialData?.finalApprover ?? "");
  const [reviewNotes, setReviewNotes] = useState(initialData?.reviewNotes ?? "");

  useEffect(() => {
    if (!initialData) return;
    queueMicrotask(() => {
      setProductReviewer(initialData.productReviewer ?? "");
      setSeoReviewer(initialData.seoReviewer ?? "");
      setOpsReviewer(initialData.opsReviewer ?? "");
      setFinalApprover(initialData.finalApprover ?? "");
      setReviewNotes(initialData.reviewNotes ?? "");
    });
  }, [initialData]);

  const buildReviewData = (
  submitAction: ReviewPublishData["submitAction"] = "save")
  : ReviewPublishData => ({
    productReviewer,
    seoReviewer,
    opsReviewer,
    finalApprover,
    reviewNotes,
    submitAction,
    publishedAt: submitAction === "publish" ? new Date().toISOString() : null
  });

  const handleSave = () => {
    onNext(buildReviewData("save"));
  };

  const labelClass = "block text-sm font-bold text-[#1F2A44] mb-2";
  const inputClass =
  "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const textareaClass =
  "w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + readiness + health check */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A44]">Review & Publish</h2>
          <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
            Publishing is blocked until key sections and sign-offs are complete.
            This also shows ownership, last edits and the approval trail.
          </p>
        </div>

        <div className="rounded-[12px] bg-[#1F2A44] p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-white/70">Package readiness</p>
            <p className="text-4xl font-bold text-white mt-1">8%</p>
          </div>
          <ol className="space-y-1.5">
            {WORKFLOW_STEPS.map((step, index) =>
            <li
              key={step}
              className="text-sm text-white/80 flex items-start gap-2">
              
                <span className="text-white/50 w-4 flex-shrink-0">
                  {index + 1}.
                </span>
                <span>{step}</span>
              </li>
            )}
          </ol>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#1F2A44] mb-4">
            Package health check
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HEALTH_CHECKS.map((item) =>
            <div
              key={item.title}
              className="rounded-[12px] border border-[#E5E7EB] p-4 flex items-start justify-between gap-3">
              
                <div>
                  <h4 className="text-sm font-bold text-[#1F2A44]">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <StatusIcon status={item.status} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section status grid */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTION_CARDS.map((card) =>
          <SectionStatusCard key={card.title} card={card} />
          )}
        </div>
      </div>

      {/* Change log and activity log */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-[#1F2A44] mb-4">
            Change log and sign-off trail
          </h3>
          <div className="space-y-3">
            {SIGN_OFF_TRAIL.map((item) =>
            <div
              key={item.stage}
              className="rounded-[12px] border border-[#E5E7EB] px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1.2fr_auto] gap-3 items-center">
              
                <p className="text-sm font-bold text-[#1F2A44]">{item.stage}</p>
                <p className="text-sm text-gray-500">{item.responsible}</p>
                <p className="text-sm text-gray-400">{item.lastAction}</p>
                <span
                className={`inline-flex px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap justify-self-start sm:justify-self-end ${BADGE_STYLES[item.badgeStyle]}`}>
                
                  {item.badge}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#1F2A44] mb-4">
            Detailed activity log
          </h3>
          <div className="rounded-[12px] border border-[#E5E7EB] overflow-x-auto">
            <Table className="w-full min-w-[600px] text-sm">
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <TableHead className="text-left px-4 py-3 font-bold text-[#1F2A44]">
                    Date and time
                  </TableHead>
                  <TableHead className="text-left px-4 py-3 font-bold text-[#1F2A44]">
                    User
                  </TableHead>
                  <TableHead className="text-left px-4 py-3 font-bold text-[#1F2A44]">
                    Section
                  </TableHead>
                  <TableHead className="text-left px-4 py-3 font-bold text-[#1F2A44]">
                    Change
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACTIVITY_LOG.map((row, index) =>
                <TableRow
                  key={`${row.section}-${index}`}
                  className={
                  index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                  }>
                  
                    <TableCell className="px-4 py-3 text-gray-500">{row.dateTime}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500">{row.user}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500">{row.section}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-500">{row.change}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Reviewer assignment + actions */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="product-reviewer" className={labelClass}>
              Product reviewer
            </Label>
            <Input
              id="product-reviewer"
              type="text"
              value={productReviewer}
              onChange={(e) => setProductReviewer(e.target.value)}
              placeholder="Assigned internally"
              className={inputClass} />
            
          </div>
          <div>
            <Label htmlFor="seo-reviewer" className={labelClass}>
              SEO reviewer
            </Label>
            <Input
              id="seo-reviewer"
              type="text"
              value={seoReviewer}
              onChange={(e) => setSeoReviewer(e.target.value)}
              placeholder="Assigned internally"
              className={inputClass} />
            
          </div>
          <div>
            <Label htmlFor="ops-reviewer" className={labelClass}>
              Ops or finance reviewer
            </Label>
            <Input
              id="ops-reviewer"
              type="text"
              value={opsReviewer}
              onChange={(e) => setOpsReviewer(e.target.value)}
              placeholder="Assigned internally"
              className={inputClass} />
            
          </div>
          <div>
            <Label htmlFor="final-approver" className={labelClass}>
              Final approver
            </Label>
            <Input
              id="final-approver"
              type="text"
              value={finalApprover}
              onChange={(e) => setFinalApprover(e.target.value)}
              placeholder="Assigned internally"
              className={inputClass} />
            
          </div>
        </div>

        <div>
          <Label htmlFor="review-notes" className={labelClass}>
            Final review notes
          </Label>
          <Textarea
            id="review-notes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className={textareaClass} />
          
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="h-11 px-5 text-sm font-medium text-[#1F2A44] border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors">
            
            Preview package
          </Button>
          <Button
            type="button"
            onClick={() => onNext(buildReviewData("submit_for_review"))}
            disabled={isSaving}
            className="h-11 px-5 text-sm font-semibold text-white bg-[#1F2A44] rounded-[12px] hover:bg-[#1F2A44]/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            
            Submit for review
          </Button>
          <Button
            type="button"
            onClick={() => onNext(buildReviewData("publish"))}
            disabled={isSaving}
            className="h-11 px-5 text-sm font-semibold text-white bg-[#10B981] rounded-[12px] hover:bg-[#10B981]/90 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            
            Publish
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>);

}
