"use client";

import Link from "next/link";
import { Icon } from "../ui/icons";
import { STEPS } from "@/lib/constants";
import type { PackageStatus } from "@/lib/package-types";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

interface PageHeaderProps {
  currentStep?: number;
  packageTitle?: string | null;
  isEditing?: boolean;
  status?: PackageStatus;
  isSaving?: boolean;
  onUseTemplate?: () => void;
  onDuplicate?: () => void;
  onPreview?: () => void;
  onSaveDraft?: () => void;
  onStatusChange?: (status: PackageStatus) => void;
}

const STATUS_OPTIONS: { value: PackageStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function PageHeader({
  currentStep = 1,
  packageTitle,
  isEditing = false,
  status = "draft",
  isSaving = false,
  onUseTemplate,
  onDuplicate,
  onPreview,
  onSaveDraft,
  onStatusChange,
}: PageHeaderProps) {
  const currentStepData = STEPS.find((s) => s.number === currentStep);
  const selectValue = STATUS_OPTIONS.some((o) => o.value === status)
    ? status
    : "draft";

  return (
    <div className="mb-6">
      <Link
        href="/packages"
        className="mb-3 flex w-fit items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600"
      >
        <Icon name="ArrowLeft" size={16} />
        <span>Back to package list</span>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A44] lg:text-3xl">
            {isEditing ? packageTitle || "Edit Package" : "Add Package"}
          </h1>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-lg text-gray-500">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span className="text-lg font-medium text-[#B48A2C]">
              {currentStepData?.title ?? "Supplier Source"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <NativeSelect
              value={selectValue}
              disabled={isSaving}
              onChange={(e) =>
                onStatusChange?.(e.target.value as PackageStatus)
              }
              wrapperClassName="w-auto"
              className="h-10 w-auto min-w-[150px] cursor-pointer rounded-[12px] border border-[#E5E7EB] bg-white pl-3 pr-8 text-sm text-gray-700 transition-colors hover:border-gray-300 focus:border-[#B48A2C] focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <Button
            type="button"
            onClick={onUseTemplate}
            disabled={isEditing || isSaving}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[12px] border border-[#E5E7EB] px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Icon name="FileSpreadsheet" size={14} />
            <span className="hidden sm:inline">Use Template</span>
          </Button>

          <Button
            type="button"
            onClick={onDuplicate}
            disabled={isSaving}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[12px] border border-[#E5E7EB] px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Icon name="Copy" size={14} />
            <span className="hidden sm:inline">Duplicate Existing</span>
          </Button>

          <Button
            type="button"
            onClick={onPreview}
            disabled={isSaving}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[12px] border border-[#E5E7EB] px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Icon name="EyeIcon" size={14} />
            <span className="hidden sm:inline">Preview</span>
          </Button>

          <Button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[12px] bg-[#1F2A44] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1F2A44]/90 disabled:opacity-60"
          >
            <Icon name="Save" size={14} />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}
