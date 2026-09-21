import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "../ui/icons";
import type {
  MediaFrontendData,
  PackageRecord,
  PricingData,
  SalesAdsAssetsData,
} from "@/lib/package-types";
import type { PackageBasicsValues } from "@/lib/validation";
import {
  saveButtonLabel,
  stepPreviousButtonClass,
  stepSaveButtonClass,
  type StepFormBaseProps,
} from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { nowIsoSgt } from "@/lib/format-date";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  getPackageImageSources,
  resolvePackageImageUrl,
  resolvePackageProxyUrl,
} from "@/lib/package-images";

interface SalesAdsAssetsFormProps extends StepFormBaseProps {
  onNext: (data: SalesAdsAssetsData) => void;
  onPrevious: () => void;
  initialData?: SalesAdsAssetsData | null;
  packageData?: PackageRecord | null;
}

function packagePublicUrl(pkg: PackageRecord | null | undefined): string {
  const slug =
    pkg?.slug?.trim() ||
    pkg?.package_basics?.slug?.trim() ||
    "package";
  return `https://fayyaztravels.com/packages/${slug}`;
}

function durationLabel(basics: PackageBasicsValues | null | undefined): string {
  const days = basics?.days?.trim();
  const nights = basics?.nights?.trim();
  if (days && nights) return `${days}D${nights}N`;
  if (days) return `${days} Days`;
  if (nights) return `${nights} Nights`;
  return "";
}

function destinationLabel(basics: PackageBasicsValues | null | undefined): string {
  return (
    basics?.countriesCovered?.trim() ||
    basics?.citiesOrRegions?.trim() ||
    basics?.startingPoint?.trim() ||
    "this destination"
  );
}

function priceLabel(pricing: PricingData | null | undefined): string {
  const discounted = pricing?.discountedPriceLabel?.trim();
  const original = pricing?.originalPriceLabel?.trim();
  const currency = pricing?.displayCurrency?.trim() || "SGD";
  if (discounted) return discounted.startsWith(currency) ? discounted : `from ${currency} ${discounted}`;
  if (original) return original.startsWith(currency) ? original : `from ${currency} ${original}`;
  return "Ask for current price";
}

function ctaLabel(media: MediaFrontendData | null | undefined): string {
  return media?.primaryCta?.trim() || "Enquire now";
}

function whatsappNumber(media: MediaFrontendData | null | undefined): string {
  const raw =
    media?.whatsappNumber?.trim() ||
    media?.whatsappLink?.replace(/[^\d]/g, "") ||
    "6594314389";
  return raw.replace(/[^\d]/g, "") || "6594314389";
}

function buildWhatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function salesCardImageUrl(pkg: PackageRecord | null | undefined, fallback?: string | null): string | null {
  if (fallback?.trim()) {
    return (
      resolvePackageProxyUrl(fallback) ||
      resolvePackageImageUrl(fallback) ||
      fallback
    );
  }
  if (!pkg) return null;
  return getPackageImageSources(pkg)[0] ?? null;
}

export default function SalesAdsAssetsForm({
  onNext,
  onPrevious,
  isSaving = false,
  initialData,
  packageData,
}: SalesAdsAssetsFormProps) {
  const [googleAdHeadlines, setGoogleAdHeadlines] = useState(
    initialData?.googleAdHeadlines ?? ""
  );
  const [socialAdCaptions, setSocialAdCaptions] = useState(
    initialData?.socialAdCaptions ?? ""
  );
  const [consultantShareMessage, setConsultantShareMessage] = useState(
    initialData?.consultantShareMessage ?? ""
  );
  const [whatsappLink, setWhatsappLink] = useState(
    initialData?.whatsappLink ?? "https://wa.me/6594314389?text="
  );
  const [salesCardTitle, setSalesCardTitle] = useState(
    initialData?.salesCardTitle ?? ""
  );
  const [salesCardPrice, setSalesCardPrice] = useState(
    initialData?.salesCardPrice ?? ""
  );
  const [salesCardCta, setSalesCardCta] = useState(
    initialData?.salesCardCta ?? ""
  );
  const [salesCardImage, setSalesCardImage] = useState<string | null>(
    initialData?.salesCardImage ?? null
  );
  const [salesCardGeneratedAt, setSalesCardGeneratedAt] = useState(
    initialData?.salesCardGeneratedAt ?? ""
  );
  const [showConsultantPreview, setShowConsultantPreview] = useState(false);

  const labelClass = "block text-sm font-bold text-[#1F2A44] mb-2";
  const textareaClass =
    "w-full min-h-[140px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";

  const packageTitle =
    packageData?.package_title?.trim() ||
    packageData?.package_basics?.packageTitle?.trim() ||
    "Untitled package";
  const basics = packageData?.package_basics;
  const media = packageData?.media_frontend;
  const pricing = packageData?.pricing;
  const duration = durationLabel(basics);
  const destination = destinationLabel(basics);
  const price = priceLabel(pricing);
  const cta = ctaLabel(media);
  const publicUrl = packagePublicUrl(packageData);
  const waNumber = whatsappNumber(media);

  const previewImageSrc = useMemo(
    () => salesCardImageUrl(packageData, salesCardImage),
    [packageData, salesCardImage]
  );

  const handleGenerateAssets = () => {
    const durationBit = duration ? ` ${duration}` : "";
    const headlines = [
      `Discover ${destination}${durationBit} — Flights, Hotels & Guided Tours Included`,
      `${packageTitle} | All-Inclusive Package ${price}`,
      `Limited Seats — Book Your ${destination} Holiday Package Today`,
    ].join("\n");

    const caption =
      `Ready for ${destination}?${duration ? ` ${duration}` : ""} with flights, hotels & daily breakfast included.\n\n` +
      `Perfect for families and first-time travellers. DM us or tap the link to enquire!\n${publicUrl}`;

    const shareMessage =
      `Hi! We have a great ${packageTitle}${duration ? ` (${duration})` : ""} — flights, hotels, transfers & guided tours included. ` +
      `Would you like me to share the full itinerary and current price?\n${publicUrl}`;

    setGoogleAdHeadlines(headlines);
    setSocialAdCaptions(caption);
    setConsultantShareMessage(shareMessage);
    setWhatsappLink(buildWhatsappLink(waNumber, shareMessage));
    toast.success("Sales and ad assets generated from package content");
  };

  const handleGenerateSalesCard = () => {
    const imagePath =
      packageData?.media_frontend?.packageCardImage ||
      packageData?.media_frontend?.desktopHeroImage ||
      packageData?.media_frontend?.mobileHeroImage ||
      packageData?.image_url ||
      null;

    setSalesCardTitle(packageTitle);
    setSalesCardPrice(price);
    setSalesCardCta(cta);
    setSalesCardImage(imagePath);
    setSalesCardGeneratedAt(nowIsoSgt());
    toast.success("Sales card generated from package title, image, price and CTA");
  };

  const handleRemoveSalesCard = () => {
    setSalesCardTitle("");
    setSalesCardPrice("");
    setSalesCardCta("");
    setSalesCardImage(null);
    setSalesCardGeneratedAt("");
    toast.success("Sales card removed");
  };

  const handleCopyPackageLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Package link copied");
    } catch {
      toast.error("Could not copy package link");
    }
  };

  const handlePreviewConsultantCard = () => {
    if (!consultantShareMessage.trim()) {
      handleGenerateAssets();
    }
    setShowConsultantPreview(true);
  };

  const toPayload = (): SalesAdsAssetsData => ({
    googleAdHeadlines,
    socialAdCaptions,
    consultantShareMessage,
    whatsappLink,
    salesCardTitle: salesCardTitle || undefined,
    salesCardPrice: salesCardPrice || undefined,
    salesCardCta: salesCardCta || undefined,
    salesCardImage: salesCardImage || undefined,
    salesCardGeneratedAt: salesCardGeneratedAt || undefined,
  });

  return (
    <div className="space-y-6">
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
              className="h-11 px-5 text-sm font-semibold text-white bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors shadow-sm"
            >
              Generate sales and ad assets
            </Button>
            <Button
              type="button"
              onClick={handleCopyPackageLink}
              className="h-11 px-5 text-sm font-semibold text-[#1F2A44] bg-white border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors"
            >
              Copy package link
            </Button>
          </div>
          <div>
            <Button
              type="button"
              onClick={handlePreviewConsultantCard}
              className="h-11 px-5 text-sm font-semibold text-[#1F2A44] bg-white border border-[#E5E7EB] rounded-[12px] hover:bg-gray-50 transition-colors"
            >
              Preview consultant card
            </Button>
          </div>
        </div>

        {showConsultantPreview ? (
          <div className="rounded-[12px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#1F2A44]">Consultant card preview</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConsultantPreview(false)}
                className="h-8 px-3 text-xs"
              >
                Close
              </Button>
            </div>
            <p className="text-sm text-[#1F2A44] whitespace-pre-wrap leading-relaxed">
              {consultantShareMessage || "Generate assets first to preview the consultant message."}
            </p>
            <p className="text-xs text-gray-500 break-all">{whatsappLink}</p>
          </div>
        ) : null}

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
              className={textareaClass}
            />
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
              className={textareaClass}
            />
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
              className={textareaClass}
            />
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
              className={inputClass}
            />
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
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleGenerateSalesCard}
              className="h-11 px-5 text-sm font-semibold text-white bg-[#1F2A44] rounded-[12px] hover:bg-[#1F2A44]/90 transition-colors shadow-sm"
            >
              Generate sales card
            </Button>
            {salesCardGeneratedAt ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveSalesCard}
                className="h-11 px-5 text-sm font-semibold border-[#D1D5DB] text-gray-600 hover:text-red-600 hover:border-red-200"
              >
                <Icon name="Trash2" size={16} />
                Remove card
              </Button>
            ) : null}
          </div>

          {salesCardGeneratedAt ? (
            <div className="overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-[#0F172A] max-w-md shadow-sm">
              <div className="relative aspect-[16/10] bg-[#1E293B]">
                {previewImageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewImageSrc}
                    alt={salesCardTitle || packageTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No package image yet — add a hero/card image in Media & Front-End
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
                  <p className="text-base font-semibold text-white leading-snug">
                    {salesCardTitle || packageTitle}
                  </p>
                  {duration ? (
                    <p className="mt-1 text-xs text-white/80">{duration} · {destination}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">From</p>
                  <p className="text-sm font-bold text-[#1F2A44]">{salesCardPrice || price}</p>
                </div>
                <span className="inline-flex h-9 items-center rounded-full bg-[#B48A2C] px-4 text-xs font-semibold text-white">
                  {salesCardCta || cta}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Click Generate sales card to build a preview from this package.
            </p>
          )}
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

        <Button
          type="button"
          onClick={() => onNext(toPayload())}
          disabled={isSaving}
          data-package-step-save=""
          className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>
  );
}
