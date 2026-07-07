"use client";

import Link from "next/link";
import { Icon } from "../ui/icons";
import { STEPS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

interface PageHeaderProps {
  currentStep?: number;
  packageTitle?: string | null;
  isEditing?: boolean;
  onUseTemplate?: () => void;
}
export default function PageHeader({
  currentStep = 1,
  packageTitle,
  isEditing = false,
  onUseTemplate,
}: PageHeaderProps) {  const currentStepData = STEPS.find(s => s.number === currentStep);
  return <div className="mb-6">
      <Link href="/packages" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3 w-fit">
        
        <Icon name="ArrowLeft" size={16} />
        <span>Back to package list</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1F2A44]">
            {isEditing ? packageTitle || "Edit Package" : "Add Package"}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-sm font-medium text-[#B48A2C]">
              {currentStepData?.title ?? "Supplier Source"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">Owner:</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-[#1F2A44]/5 text-[#1F2A44] rounded-full">
              {currentStepData?.department ?? "Product"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <NativeSelect defaultValue="draft" className="appearance-none h-10 pl-3 pr-8 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors">
              
              <option value="draft">Draft</option>
              <option value="pending">Pending Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </NativeSelect>
            <Icon name="ChevronDown" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            
          </div>

          {/* Use Template */}
          <Button
            type="button"
            onClick={onUseTemplate}
            disabled={isEditing}
            className="h-10 px-3 text-sm text-gray-600 border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40"
          >
            <Icon name="FileSpreadsheet" size={14} />
            <span className="hidden sm:inline">Use Template</span>
          </Button>
          {/* Duplicate */}
          <Button className="h-10 px-3 text-sm text-gray-600 border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <Icon name="Copy" size={14} />
            <span className="hidden sm:inline">Duplicate Existing</span>
          </Button>

          {/* Preview */}
          <Button className="h-10 px-3 text-sm text-gray-600 border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <Icon name="EyeIcon" size={14} />
            <span className="hidden sm:inline">Preview</span>
          </Button>

          {/* Save Draft */}
          <Button className="h-10 px-5 text-sm font-medium text-white bg-[#1F2A44] rounded-[12px] hover:bg-[#1F2A44]/90 transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap">
            <Icon name="Save" size={14} />
            Save Draft
          </Button>
        </div>
      </div>
    </div>;
}
