import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Icon } from "../ui/icons";
import type { MediaFrontendData, PackageMediaAsset } from "@/lib/package-types";
import { uploadMediaFile } from "@/lib/media-api";
import {
  saveButtonLabel,
  stepPreviousButtonClass,
  stepSaveButtonClass,
  type StepFormBaseProps,
} from "./step-form-props";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import PackageRichTextEditor from "./PackageRichTextEditor";
import { resolveMediaSrc } from "@/lib/package-images";

interface MediaFrontendFormProps extends StepFormBaseProps {
  onNext: (data: MediaFrontendData) => void;
  onPrevious: () => void;
  initialData?: MediaFrontendData | null;
}

type HeroSlotKey = "desktopHeroImage" | "mobileHeroImage" | "packageCardImage";

type HighlightSlotKey =
  | "highlightImages"
  | "marketingBanners"
  | "promotionalAssets"
  | "highlightGraphics";

const HIGHLIGHT_SLOTS: {
  key: HighlightSlotKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "highlightImages",
    title: "Images",
    subtitle: "Package highlight photos",
  },
  {
    key: "marketingBanners",
    title: "Marketing banners",
    subtitle: "Hero / campaign banners",
  },
  {
    key: "promotionalAssets",
    title: "Promotional assets",
    subtitle: "Promo creatives & overlays",
  },
  {
    key: "highlightGraphics",
    title: "Highlight graphics",
    subtitle: "Icons & highlight artwork",
  },
];

function createAssetId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface SingleUploadCardProps {
  title: string;
  subtitle?: string;
  value: string | null | undefined;
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onClear: () => void;
}

function SingleUploadCard({
  title,
  subtitle,
  value,
  uploading,
  error,
  onUpload,
  onClear,
}: SingleUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-[#FFF0F3] border border-dashed border-[#F4C8D0] rounded-[12px] p-5 flex flex-col items-center text-center transition-shadow hover:shadow-md">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(file);
        }}
      />

      {value ? (
        <>
          <div className="mb-3 w-full overflow-hidden rounded-[8px] border border-[#F4C8D0] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveMediaSrc(value)} alt={title} className="h-28 w-full object-cover" />
          </div>
          <h4 className="text-sm font-semibold text-[#1F2A44] mb-1">{title}</h4>
          {subtitle && <p className="text-xs text-[#D47786] mb-3">{subtitle}</p>}
          <div className="mt-auto flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-[#C8485E] bg-white border border-[#F4C8D0] rounded-[8px] hover:bg-[#FFF5F7] hover:border-[#C8485E] transition-colors shadow-sm"
            >
              {uploading ? "Uploading…" : "Replace"}
            </Button>
            <Button
              type="button"
              disabled={uploading}
              onClick={onClear}
              className="px-4 py-2 text-xs font-semibold text-[#B91C1C] bg-white border border-[#FECACA] rounded-[8px] hover:bg-[#FEF2F2] transition-colors"
            >
              Remove
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-white border border-[#F4C8D0] flex items-center justify-center mb-3 shadow-sm">
            <Icon name="Upload" size={20} className="text-[#C8485E]" />
          </div>
          <h4 className="text-sm font-semibold text-[#1F2A44] mb-1">{title}</h4>
          {subtitle && <p className="text-xs text-[#D47786] mb-4">{subtitle}</p>}
          <Button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-auto px-5 py-2 text-xs font-semibold text-[#C8485E] bg-white border border-[#F4C8D0] rounded-[8px] hover:bg-[#FFF5F7] hover:border-[#C8485E] transition-colors shadow-sm"
          >
            {uploading ? "Uploading…" : "Upload image"}
          </Button>
        </>
      )}

      {error && <p className="mt-2 text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}

interface MultiAssetUploadCardProps {
  title: string;
  subtitle: string;
  assets: PackageMediaAsset[];
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  onAltChange: (id: string, altText: string) => void;
}

function MultiAssetUploadCard({
  title,
  subtitle,
  assets,
  uploading,
  error,
  onUpload,
  onRemove,
  onAltChange,
}: MultiAssetUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4 flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#1F2A44]">{title}</h4>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <Button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold text-[#C8485E] bg-[#FFF0F3] border border-[#F4C8D0] rounded-[8px] hover:bg-[#FFF5F7] hover:border-[#C8485E] transition-colors"
        >
          {uploading ? "Uploading…" : "Add file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(file);
          }}
        />
      </div>

      {assets.length === 0 ? (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 min-h-[120px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#F4C8D0] bg-[#FFF0F3] px-4 py-6 text-center transition-colors hover:border-[#C8485E] disabled:opacity-60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#F4C8D0] bg-white">
            <Icon name="Upload" size={18} className="text-[#C8485E]" />
          </div>
          <span className="text-xs font-medium text-[#C8485E]">
            Upload {title.toLowerCase()}
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FB] p-3"
            >
              <div className="flex gap-3">
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.altText || title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    type="text"
                    value={asset.altText ?? ""}
                    onChange={(event) => onAltChange(asset.id, event.target.value)}
                    placeholder="Alt text (required for accessibility)"
                    className="h-9 w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] text-gray-400">
                      {asset.filename || asset.url}
                    </p>
                    <Button
                      type="button"
                      onClick={() => onRemove(asset.id)}
                      className="h-7 px-2 text-[11px] font-semibold text-[#B91C1C] bg-white border border-[#FECACA] rounded-[6px] hover:bg-[#FEF2F2]"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[#B91C1C]">{error}</p>}
    </div>
  );
}

export default function MediaFrontendForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: MediaFrontendFormProps) {
  const { register, handleSubmit, control, reset, setValue, getValues } =
    useForm<MediaFrontendData>({
      defaultValues: {
        videoLink: "",
        priceDisplayType: "From price",
        primaryCta: "Book Now",
        secondaryCta: "Speak to a Travel Consultant",
        whatsappNumber: "6594314389",
        whatsappLink: "https://wa.me/6594314389",
        desktopHeroImage: null,
        mobileHeroImage: null,
        packageCardImage: null,
        highlightImages: [],
        marketingBanners: [],
        promotionalAssets: [],
        highlightGraphics: [],
        whyChooseThisPackage: "",
      },
    });

  const [whyChooseThisPackage, setWhyChooseThisPackage] = useState(
    initialData?.whyChooseThisPackage ?? ""
  );

  useEffect(() => {
    if (!initialData) return;
    reset({
      ...initialData,
      highlightImages: initialData.highlightImages ?? [],
      marketingBanners: initialData.marketingBanners ?? [],
      promotionalAssets: initialData.promotionalAssets ?? [],
      highlightGraphics: initialData.highlightGraphics ?? [],
      whyChooseThisPackage: initialData.whyChooseThisPackage ?? "",
    });
    setWhyChooseThisPackage(initialData.whyChooseThisPackage ?? "");
  }, [initialData, reset]);
  const [heroUploading, setHeroUploading] = useState<Partial<Record<HeroSlotKey, boolean>>>({});
  const [heroErrors, setHeroErrors] = useState<Partial<Record<HeroSlotKey, string | null>>>({});
  const [highlightUploading, setHighlightUploading] = useState<
    Partial<Record<HighlightSlotKey, boolean>>
  >({});
  const [highlightErrors, setHighlightErrors] = useState<
    Partial<Record<HighlightSlotKey, string | null>>
  >({});

  const whatsappNumber = useWatch({ control, name: "whatsappNumber" }) ?? "";
  const desktopHeroImage = useWatch({ control, name: "desktopHeroImage" });
  const mobileHeroImage = useWatch({ control, name: "mobileHeroImage" });
  const packageCardImage = useWatch({ control, name: "packageCardImage" });
  const highlightImages = useWatch({ control, name: "highlightImages" }) ?? [];
  const marketingBanners = useWatch({ control, name: "marketingBanners" }) ?? [];
  const promotionalAssets = useWatch({ control, name: "promotionalAssets" }) ?? [];
  const highlightGraphics = useWatch({ control, name: "highlightGraphics" }) ?? [];

  const highlightAssetsByKey: Record<HighlightSlotKey, PackageMediaAsset[]> = {
    highlightImages,
    marketingBanners,
    promotionalAssets,
    highlightGraphics,
  };

  async function handleHeroUpload(slot: HeroSlotKey, file: File) {
    setHeroErrors((prev) => ({ ...prev, [slot]: null }));
    setHeroUploading((prev) => ({ ...prev, [slot]: true }));
    try {
      const result = await uploadMediaFile(file);
      setValue(slot, result.url, { shouldDirty: true });
    } catch (error) {
      setHeroErrors((prev) => ({
        ...prev,
        [slot]: error instanceof Error ? error.message : "Upload failed",
      }));
    } finally {
      setHeroUploading((prev) => ({ ...prev, [slot]: false }));
    }
  }

  async function handleHighlightUpload(slot: HighlightSlotKey, file: File) {
    setHighlightErrors((prev) => ({ ...prev, [slot]: null }));
    setHighlightUploading((prev) => ({ ...prev, [slot]: true }));
    try {
      const result = await uploadMediaFile(file);
      const current = getValues(slot) ?? [];
      const next: PackageMediaAsset[] = [
        ...current,
        {
          id: createAssetId(),
          url: result.url,
          filename: result.filename || file.name,
          altText: "",
        },
      ];
      setValue(slot, next, { shouldDirty: true });
    } catch (error) {
      setHighlightErrors((prev) => ({
        ...prev,
        [slot]: error instanceof Error ? error.message : "Upload failed",
      }));
    } finally {
      setHighlightUploading((prev) => ({ ...prev, [slot]: false }));
    }
  }

  function removeHighlightAsset(slot: HighlightSlotKey, id: string) {
    const current = getValues(slot) ?? [];
    setValue(
      slot,
      current.filter((asset) => asset.id !== id),
      { shouldDirty: true }
    );
  }

  function updateHighlightAlt(slot: HighlightSlotKey, id: string, altText: string) {
    const current = getValues(slot) ?? [];
    setValue(
      slot,
      current.map((asset) => (asset.id === id ? { ...asset, altText } : asset)),
      { shouldDirty: true }
    );
  }

  const onSubmit = (data: MediaFrontendData) => {
    onNext({
      ...data,
      whatsappLink: data.whatsappNumber
        ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
        : data.whatsappLink,
      whyChooseThisPackage,
      // Ensure deprecated fields are not re-sent from this step
      frontEndSummary: undefined,
      clientFacingNotes: undefined,
    });
  };

  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const mediaTags = ["Image source", "Alt text", "Hero image", "Mobile image"];

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm">
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#1F2A44]">
            Media & Front-End Display
          </h2>
          <Button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-gray-400 hover:bg-gray-300 hover:text-gray-500 transition-colors"
            title="Centralize package marketing content and frontend assets"
          >
            <span className="text-[11px] font-bold leading-none">i</span>
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Centralize package marketing content and frontend assets. Every image
          should include alt text at upload. CTA changes automatically based on
          price display.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="mb-6 p-5 rounded-[12px] bg-[#FFFDF5] border border-[#F0E4A8]">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="mt-0.5 shrink-0">
              <Icon name="Info" size={16} className="text-[#B48A2C]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6B5E1A] mb-1">Media guide</p>
              <p className="text-sm text-[#6B5E1A] leading-relaxed">
                Use supplier-owned images, licensed images, or images with clear
                permission. Do not upload images without a source. Alt text should
                describe the image naturally for accessibility and SEO. Frontend
                Notes are managed in Package Basics. Important Notes are managed
                in Inclusions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {mediaTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-[#9E7D2A] border border-[#D4A83C] rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SingleUploadCard
            title="Desktop hero image"
            subtitle="Required before publishing"
            value={desktopHeroImage}
            uploading={!!heroUploading.desktopHeroImage}
            error={heroErrors.desktopHeroImage ?? null}
            onUpload={(file) => void handleHeroUpload("desktopHeroImage", file)}
            onClear={() => setValue("desktopHeroImage", null, { shouldDirty: true })}
          />
          <SingleUploadCard
            title="Mobile hero image"
            subtitle="Required before publishing"
            value={mobileHeroImage}
            uploading={!!heroUploading.mobileHeroImage}
            error={heroErrors.mobileHeroImage ?? null}
            onUpload={(file) => void handleHeroUpload("mobileHeroImage", file)}
            onClear={() => setValue("mobileHeroImage", null, { shouldDirty: true })}
          />
          <SingleUploadCard
            title="Package card image"
            subtitle="Required before publishing"
            value={packageCardImage}
            uploading={!!heroUploading.packageCardImage}
            error={heroErrors.packageCardImage ?? null}
            onUpload={(file) => void handleHeroUpload("packageCardImage", file)}
            onClear={() => setValue("packageCardImage", null, { shouldDirty: true })}
          />
        </div>

        {/* Package Highlights Upload Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#1F2A44]">
              Package Highlights Upload
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Dedicated upload area for images, marketing banners, promotional
              assets, and package highlight graphics.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HIGHLIGHT_SLOTS.map((slot) => (
              <MultiAssetUploadCard
                key={slot.key}
                title={slot.title}
                subtitle={slot.subtitle}
                assets={highlightAssetsByKey[slot.key]}
                uploading={!!highlightUploading[slot.key]}
                error={highlightErrors[slot.key] ?? null}
                onUpload={(file) => void handleHighlightUpload(slot.key, file)}
                onRemove={(id) => removeHighlightAsset(slot.key, id)}
                onAltChange={(id, altText) => updateHighlightAlt(slot.key, id, altText)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
          <div>
            <Label htmlFor="videoLink" className={labelClass}>
              Video link
            </Label>
            <Input
              id="videoLink"
              type="text"
              placeholder="Optional"
              className={inputClass}
              {...register("videoLink")}
            />
          </div>

          <div>
            <Label htmlFor="priceDisplayType" className={labelClass}>
              Price display type
            </Label>
            <NativeSelect
              id="priceDisplayType"
              className={inputClass}
              {...register("priceDisplayType")}
            >
              <option value="From price">From price</option>
              <option value="Fixed price">Fixed price</option>
              <option value="On request">On request</option>
            </NativeSelect>
          </div>

          <div>
            <Label htmlFor="primaryCta" className={labelClass}>
              Primary CTA
            </Label>
            <Input
              id="primaryCta"
              type="text"
              placeholder="e.g., Book Now"
              className={inputClass}
              {...register("primaryCta")}
            />
          </div>

          <div>
            <Label htmlFor="secondaryCta" className={labelClass}>
              Secondary CTA
            </Label>
            <Input
              id="secondaryCta"
              type="text"
              placeholder="e.g., Speak to a Travel Consultant"
              className={inputClass}
              {...register("secondaryCta")}
            />
          </div>

          <div>
            <Label htmlFor="whatsappNumber" className={labelClass}>
              WhatsApp number
            </Label>
            <Input
              id="whatsappNumber"
              type="text"
              className={inputClass}
              {...register("whatsappNumber")}
            />
          </div>

          <div>
            <Label htmlFor="whatsappLink" className={labelClass}>
              Auto-generated WhatsApp link
            </Label>
            <Input
              id="whatsappLink"
              type="text"
              className={`${inputClass} text-gray-400 bg-[#F8F9FB] font-mono text-xs`}
              value={
                whatsappNumber
                  ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
                  : ""
              }
              readOnly
            />
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] my-6" />

        <div className="mb-6">
          <PackageRichTextEditor
            label="Why choose this package"
            caption="Use Main Bullet (•), Divider Style (/), or Detail Style (–) so highlights read clearly on the frontend."
            placeholder="Write reasons why customers should choose this package..."
            value={whyChooseThisPackage}
            onChange={setWhyChooseThisPackage}
          />
        </div>

        <div className="mt-8 pt-5 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3">
          <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
            <Icon name="ChevronLeft" size={16} />
            Previous
          </Button>

          <p className="text-xs text-gray-400 text-center flex-1">
            Save as you go. Incomplete sections stay as draft.
          </p>

          <Button type="submit" disabled={isSaving} data-package-step-save="" className={stepSaveButtonClass}>
            {saveButtonLabel(isSaving)}
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
