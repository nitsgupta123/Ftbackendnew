import { useState } from "react";
import { Icon } from "../ui/icons";
import type { SeoData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface SeoFormProps extends StepFormBaseProps {
  onNext: (data: SeoData) => void;
  onPrevious: () => void;
  initialData?: SeoData | null;
}
const RELATED_PACKAGES_OPTIONS = ["Auto suggest by destination and category", "Manual selection only", "Hide related packages"];
const INDEX_STATUS_OPTIONS = ["Index", "Noindex"];
const SEO_STATUS_OPTIONS = ["Not started", "Draft", "Pending review", "Approved", "Locked"];
export default function SeoForm({
  onNext,
  onPrevious,
  isSaving = false
}: SeoFormProps) {
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [relatedPackages, setRelatedPackages] = useState(RELATED_PACKAGES_OPTIONS[0]);
  const [manualRelatedPackages, setManualRelatedPackages] = useState("");
  const [internalLinks, setInternalLinks] = useState("");
  const [indexStatus, setIndexStatus] = useState(INDEX_STATUS_OPTIONS[0]);
  const [seoReviewer] = useState("Auto-assigned from logged-in SEO user");
  const [seoStatus, setSeoStatus] = useState(SEO_STATUS_OPTIONS[0]);
  const labelClass = "block text-sm font-bold text-[#1F2A44] mb-2";
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10`;
  const textareaClass = "w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const largeTextareaClass = `${textareaClass} min-h-[160px]`;
  return <div className="space-y-6">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A44]">SEO</h2>
          <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
            SEO can be drafted by product but must be signed off by the SEO team.
          </p>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl leading-relaxed">
            Image alt text lives with each image upload.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="meta-title" className={labelClass}>
              Meta title
            </Label>
            <Input id="meta-title" type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className={inputClass} />
            
          </div>

          <div>
            <Label htmlFor="meta-description" className={labelClass}>
              Meta description
            </Label>
            <Textarea id="meta-description" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} className={textareaClass} />
            
          </div>

          <div>
            <Label htmlFor="focus-keyword" className={labelClass}>
              Focus keyword
            </Label>
            <Input id="focus-keyword" type="text" value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} className={inputClass} />
            
          </div>

          <div>
            <Label htmlFor="secondary-keywords" className={labelClass}>
              Secondary keywords
            </Label>
            <Textarea id="secondary-keywords" value={secondaryKeywords} onChange={e => setSecondaryKeywords(e.target.value)} className={textareaClass} />
            
          </div>

          <div>
            <Label htmlFor="related-packages" className={labelClass}>
              Related packages
            </Label>
            <NativeSelect id="related-packages" value={relatedPackages} onChange={e => setRelatedPackages(e.target.value)} className={selectClass}>
              
              {RELATED_PACKAGES_OPTIONS.map(option => <option key={option} value={option}>
                  {option}
                </option>)}
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="manual-related-packages" className={labelClass}>
              Manual related packages
            </Label>
            <Textarea id="manual-related-packages" value={manualRelatedPackages} onChange={e => setManualRelatedPackages(e.target.value)} placeholder="Search existing packages and select. Powers 'You might also like'." className={textareaClass} />
            
          </div>

          <div>
            <Label htmlFor="internal-links" className={labelClass}>
              Internal links
            </Label>
            <Textarea id="internal-links" value={internalLinks} onChange={e => setInternalLinks(e.target.value)} className={largeTextareaClass} />
            
          </div>

          <div>
            <Label htmlFor="index-status" className={labelClass}>
              Index status
            </Label>
            <NativeSelect id="index-status" value={indexStatus} onChange={e => setIndexStatus(e.target.value)} className={selectClass}>
              
              {INDEX_STATUS_OPTIONS.map(option => <option key={option} value={option}>
                  {option}
                </option>)}
            </NativeSelect>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="seo-reviewer" className={labelClass}>
              SEO reviewer
            </Label>
            <Input id="seo-reviewer" type="text" value={seoReviewer} readOnly className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
            
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              This should be automatically linked to the logged-in user with SEO
              permission, not manually typed.
            </p>
          </div>

          <div>
            <Label htmlFor="seo-status" className={labelClass}>
              SEO status
            </Label>
            <NativeSelect id="seo-status" value={seoStatus} onChange={e => setSeoStatus(e.target.value)} className={selectClass}>
              
              {SEO_STATUS_OPTIONS.map(option => <option key={option} value={option}>
                  {option}
                </option>)}
            </NativeSelect>
          </div>
        </div>

        <div className="rounded-[12px] bg-[#FFFBEB] border border-[#D9B24C]/60 px-5 py-4">
          <p className="text-sm text-[#92400E] leading-relaxed">
            Permission logic: Product can view and draft SEO fields, but only
            users with SEO access should be able to approve or lock SEO edits.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button type="button" onClick={() => onNext({
        metaTitle,
        metaDescription,
        focusKeyword,
        secondaryKeywords,
        relatedPackages,
        manualRelatedPackages,
        internalLinks,
        indexStatus,
        seoReviewer,
        seoStatus
      })} disabled={isSaving} data-package-step-save="" className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>;
}
