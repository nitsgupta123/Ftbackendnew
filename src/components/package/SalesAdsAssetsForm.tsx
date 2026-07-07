"use client";

import { useState } from "react";
import { Icon } from "../ui/icons";

import type { SalesAdsAssetsData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";import { Button } from "@/components/ui/button";import { Label } from "@/components/ui/label";import { Textarea } from "@/components/ui/textarea";import { Input } from "@/components/ui/input";

interface SalesAdsAssetsFormProps extends StepFormBaseProps {
  onNext: (data: SalesAdsAssetsData) => void;
  onPrevious: () => void;
  initialData?: SalesAdsAssetsData | null;
}

export default function SalesAdsAssetsForm({
  onNext,
  onPrevious,
  isSaving = false
}: SalesAdsAssetsFormProps) {
  const [googleAdHeadlines, setGoogleAdHeadlines] = useState("");
  const [socialAdCaptions, setSocialAdCaptions] = useState("");
  const [consultantShareMessage, setConsultantShareMessage] = useState("");
  const [whatsappLink, setWhatsappLink] = useState(
    "https://wa.me/6594314389?text="
  );

  const labelClass = "block text-sm font-bold text-[#1F2A44] mb-2";

  const textareaClass =
  "w-full min-h-[140px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";

  const inputClass =
  "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";

  const handleGenerateAssets = () => {
    setGoogleAdHeadlines(
      "Discover Japan in 7 Days — Flights, Hotels & Guided Tours Included\n" +
      "Tokyo to Kyoto Adventure | All-Inclusive Package from SGD 2,499\n" +
      "Limited Seats — Book Your Japan Holiday Package Today"
    );
    setSocialAdCaptions(
      "Ready for Japan? 🇯🇵 7 days, 6 nights with flights, hotels & daily breakfast included.\n\n" +
      "Perfect for families and first-time travellers. DM us or tap the link to enquire!"
    );
    setConsultantShareMessage(
      "Hi! We have a great Japan 7D6N package — flights, hotels, transfers & guided tours included. " +
      "Would you like me to share the full itinerary and current price?"
    );
  };

  const handleCopyPackageLink = async () => {
    try {
      await navigator.clipboard.writeText(
        "https://fayyaztravels.com/packages/japan-7d6n"
      );
    } catch {

      // Clipboard may be unavailable in some contexts
    }};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A44]">Sales & Ads Assets</h2>
          <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
            This is separate from front-end display. Marketing or consultants can
            generate campaign assets from the package content once the core package
            is ready.
          </p>
        </div>

        <div className="rounded-[12px] bg-[#F0FFF4] border border-[#9AE6B4] px-5 py-4">
          <p className="text-sm text-[#22543D] leading-relaxed">
            This section should generate from the package content, not make the
            package uploader do extra manual work. Click generate to create editable
            first drafts.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleGenerateAssets}
              className="h-11 px-5 text-sm font-semibold text-white bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors shadow-sm">
              
              Generate sales and ad assets
            </Button>
            <Button
              type="button"
              onClick={handleCopyPackageLink}
              className="h-11 px-5 text-sm font-semibold text-[#1F2A44] bg-white border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors">
              
              Copy package link
            </Button>
          </div>
          <div>
            <Button
              type="button"
              className="h-11 px-5 text-sm font-semibold text-[#1F2A44] bg-white border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors">
              
              Preview consultant card
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="google-ad-headlines" className={labelClass}>
              Google ad headline ideas
            </Label>
            <Textarea
              id="google-ad-headlines"
              value={googleAdHeadlines}
              onChange={(e) => setGoogleAdHeadlines(e.target.value)}
              placeholder="Generated headline variations will appear here"
              className={textareaClass} />
            
          </div>

          <div>
            <Label htmlFor="social-ad-captions" className={labelClass}>
              Social ad caption ideas
            </Label>
            <Textarea
              id="social-ad-captions"
              value={socialAdCaptions}
              onChange={(e) => setSocialAdCaptions(e.target.value)}
              placeholder="Generated caption variations will appear here"
              className={textareaClass} />
            
          </div>

          <div>
            <Label htmlFor="consultant-share-message" className={labelClass}>
              Consultant share message
            </Label>
            <Textarea
              id="consultant-share-message"
              value={consultantShareMessage}
              onChange={(e) => setConsultantShareMessage(e.target.value)}
              placeholder="Short WhatsApp-ready sales message with package link"
              className={textareaClass} />
            
          </div>

          <div>
            <Label htmlFor="whatsapp-link" className={labelClass}>
              Generated campaign WhatsApp link
            </Label>
            <Input
              id="whatsapp-link"
              type="text"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              className={inputClass} />
            
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
        <div className="rounded-[12px] border border-[#E5E7EB] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1F2A44]">
              Generated sales image or card
            </h3>
            <p className="text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">
              Generated from hero image, package title, price label and CTA. Final
              design approval should sit with Marketing.
            </p>
          </div>
          <Button
            type="button"
            className="h-11 px-5 text-sm font-semibold text-white bg-[#1F2A44] rounded-[12px] hover:bg-[#1F2A44]/90 transition-colors shadow-sm">
            
            Generate sales card
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
          onClick={() =>
          onNext({
            googleAdHeadlines,
            socialAdCaptions,
            consultantShareMessage,
            whatsappLink
          })
          }
          disabled={isSaving}
          className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>);

}
