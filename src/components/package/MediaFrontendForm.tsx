"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Icon } from "../ui/icons";
import {
  highlightValidationError,
  normalizePackageHighlights,
  PACKAGE_HIGHLIGHT_LIMIT,
} from "@/lib/package-content";
import type { MediaFrontendData, PackageHighlight, PackageMediaAsset } from "@/lib/package-types";
import { toast } from "sonner";
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

interface MediaFrontendFormProps extends StepFormBaseProps {
  onNext: (data: MediaFrontendData) => void;
  onPrevious: () => void;
  initialData?: MediaFrontendData | null;
}

type HeroSlotKey = "desktopHeroImage" | "mobileHeroImage" | "packageCardImage";

type HighlightSlotKey = "marketingBanners" | "promotionalAssets";

const HIGHLIGHT_SLOTS: {
  key: HighlightSlotKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "marketingBanners",
    title: "Marketing banners",
    subtitle: "Wide campaign and page banners. These are not the four Tour highlight cards.",
  },
  {
    key: "promotionalAssets",
    title: "Promotional assets",
    subtitle: "Offer creatives and overlays. These are not the four Tour highlight cards.",
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
            <img src={value} alt={title} className="h-28 w-full object-cover" />
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

function PackageHighlightCard({
  index,
  highlight,
  uploading,
  onUpload,
  onChange,
  onClear,
}: {
  index: number;
  highlight: PackageHighlight;
  uploading: boolean;
  onUpload: (file: File) => void;
  onChange: (patch: Partial<PackageHighlight>) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[#1F2A44]">Highlight {index + 1}</h4>
        {highlight.url ? (
          <Button
            type="button"
            onClick={onClear}
            className="h-7 px-2 text-[11px] font-semibold text-[#B91C1C] bg-white border border-[#FECACA] rounded-[6px] hover:bg-[#FEF2F2]"
          >
            Remove
          </Button>
        ) : null}
      </div>
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
      {highlight.url ? (
        <div className="mb-3 overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-[#F8F9FB]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={highlight.url}
            alt={highlight.altText || `Highlight ${index + 1}`}
            className="h-32 w-full object-cover"
          />
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mb-3 flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#F4C8D0] bg-[#FFF0F3] px-4 py-6 text-center"
        >
          <Icon name="Upload" size={18} className="text-[#C8485E]" />
          <span className="text-xs font-medium text-[#C8485E]">
            {uploading ? "Uploading…" : "Upload highlight image"}
          </span>
        </button>
      )}
      {highlight.url ? (
        <Button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mb-3 px-3 py-1.5 text-xs font-semibold text-[#C8485E] bg-[#FFF0F3] border border-[#F4C8D0] rounded-[8px]"
        >
          {uploading ? "Uploading…" : "Replace image"}
        </Button>
      ) : null}
      <div className="space-y-3">
        <div>
          <Label htmlFor={`highlight-alt-${highlight.id}`} className="mb-1 block text-xs font-medium text-gray-700">
            Alt text
          </Label>
          <Input
            id={`highlight-alt-${highlight.id}`}
            type="text"
            value={highlight.altText ?? ""}
            onChange={(event) => onChange({ altText: event.target.value })}
            placeholder="Describe the photo for screen readers"
            className="h-9 w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-xs"
          />
          <p className="mt-1 text-[11px] text-gray-400">Hidden on the page. Used for accessibility.</p>
        </div>
        <div>
          <Label
            htmlFor={`highlight-description-${highlight.id}`}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Short description
          </Label>
          <Input
            id={`highlight-description-${highlight.id}`}
            type="text"
            value={highlight.description ?? ""}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="The line visitors read under this photo"
            maxLength={180}
            className="h-9 w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-xs"
          />
          <p className="mt-1 text-[11px] text-gray-400">Shown under the photo. Separate from the alt text.</p>
        </div>
      </div>
    </div>
  );
}

function HighlightsWebsitePreview({ highlights }: { highlights: PackageHighlight[] }) {
  const visible = highlights.filter((item) => item.url?.trim() || item.description?.trim());
  return (
    <div className="mt-4 overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white">
      <div className="bg-[#F8F4EC] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A6A22]">
        Client-facing website preview
      </div>
      <p className="border-b border-[#E5E7EB] px-4 py-2 text-xs text-gray-500">
        Tour highlights on the package page. Visitors see the photo and the short description. Alt text stays hidden.
      </p>
      <div className="px-5 py-5">
        <h3 className="text-2xl font-semibold leading-tight text-[#1A2433]">Tour highlights</h3>
        {visible.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            Add an image or short description to see the cards here.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((item, index) => (
              <article
                key={item.id}
                className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#E8EBF0] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.06)]"
              >
                <div className="aspect-[3/2] bg-[#F7F8FA]">
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.altText || `Highlight ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-[11px] text-gray-400">
                      Image not uploaded yet
                    </div>
                  )}
                </div>
                <p className="px-3 py-3 text-sm leading-snug text-[#1A2433]">
                  {item.description?.trim() || "Short description appears here"}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WhyChooseWebsitePreview({ html }: { html: string }) {
  const empty = !html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
  return (
    <div className="mt-4 overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white">
      <div className="bg-[#F8F4EC] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A6A22]">
        Client-facing website preview
      </div>
      <p className="border-b border-[#E5E7EB] px-4 py-2 text-xs text-gray-500">
        This is the Why choose this package block on the public package page. Main, divider, and detail lists keep the same marks.
      </p>
      <div className="border-b border-[#E8EBF0] px-6 py-6">
        <h3 className="text-[1.65rem] font-semibold leading-tight text-[#1A2433]">Why choose this package</h3>
        {empty ? (
          <p className="mt-4 text-base leading-7 text-[#667085]">
            Write the reasons above. They appear in this block, under the heading, on the package page.
          </p>
        ) : (
          <div
            className="pkg-editor-content pkg-site-prose mt-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
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
        whatsappLink: "https://wa.me/6594314389?tex...",
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
  const [packageHighlights, setPackageHighlights] = useState<PackageHighlight[]>(() =>
    normalizePackageHighlights(initialData)
  );
  const [highlightCardUploading, setHighlightCardUploading] = useState<number | null>(null);

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
    setPackageHighlights(normalizePackageHighlights(initialData));
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
  const marketingBanners = useWatch({ control, name: "marketingBanners" }) ?? [];
  const promotionalAssets = useWatch({ control, name: "promotionalAssets" }) ?? [];

  const highlightAssetsByKey: Record<HighlightSlotKey, PackageMediaAsset[]> = {
    marketingBanners,
    promotionalAssets,
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

  async function uploadPackageHighlight(index: number, file: File) {
    setHighlightCardUploading(index);
    try {
      const result = await uploadMediaFile(file);
      setPackageHighlights((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                url: result.url,
                filename: result.filename || file.name,
              }
            : item
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setHighlightCardUploading(null);
    }
  }

  const onSubmit = (data: MediaFrontendData) => {
    const highlightError = highlightValidationError(packageHighlights);
    if (highlightError) {
      toast.error(highlightError);
      return;
    }
    onNext({
      ...data,
      whatsappLink: data.whatsappNumber
        ? `https://wa.me/${data.whatsappNumber.replace(/\D/g, "")}`
        : data.whatsappLink,
      whyChooseThisPackage,
      packageHighlights,
      frontEndSummary: undefined,
      clientFacingNotes: undefined,
    });
  };

  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const mediaTags = ["Image source", "Alt text", "Hero image", "Mobile image"];

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm animate-fade-in">
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

        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#1F2A44]">
              Package highlights upload
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Keep about {PACKAGE_HIGHLIGHT_LIMIT} highlights. Each one has its own image,
              alt text, and a separate short description. The website shows these as Tour highlight cards.
              Marketing banners and promotional assets are a different upload, below.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packageHighlights.map((highlight, index) => (
              <PackageHighlightCard
                key={highlight.id}
                index={index}
                highlight={highlight}
                uploading={highlightCardUploading === index}
                onUpload={(file) => void uploadPackageHighlight(index, file)}
                onChange={(patch) =>
                  setPackageHighlights((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, ...patch } : item
                    )
                  )
                }
                onClear={() =>
                  setPackageHighlights((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, url: "", filename: undefined }
                        : item
                    )
                  )
                }
              />
            ))}
          </div>
          <HighlightsWebsitePreview highlights={packageHighlights} />
        </div>

        <div className="mb-8">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#1F2A44]">
              Marketing banners and promotional assets
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Marketing banners are wide campaign and page banners. Promotional assets
              are offer creatives and overlays. Neither of these is a Tour highlight card.
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
          <WhyChooseWebsitePreview html={whyChooseThisPackage} />
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
