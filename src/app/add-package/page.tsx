"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import PageHeader from "@/components/package/PageHeader";
import ProgressCard from "@/components/package/ProgressCard";
import GuideCard from "@/components/package/GuideCard";
import Stepper from "@/components/package/Stepper";
import SupplierForm from "@/components/package/SupplierForm";
import PackageBasicsForm from "@/components/package/PackageBasicsForm";
import MediaFrontendForm from "@/components/package/MediaFrontendForm";
import PricingForm from "@/components/package/PricingForm";
import ItineraryForm from "@/components/package/ItineraryForm";
import HotelsForm from "@/components/package/HotelsForm";
import InclusionsForm from "@/components/package/InclusionsForm";
import BookingPolicyForm from "@/components/package/BookingPolicyForm";
import ConsultantViewForm from "@/components/package/ConsultantViewForm";
import SupplierQuoteTool from "@/components/package/SupplierQuoteTool";
import FrontEndFaqsForm from "@/components/package/FrontEndFaqsForm";
import SalesAdsAssetsForm from "@/components/package/SalesAdsAssetsForm";
import SeoForm from "@/components/package/SeoForm";
import ReviewPublishForm from "@/components/package/ReviewPublishForm";
import PackageAuditCard from "@/components/package/PackageAuditCard";
import UseTemplateModal from "@/components/templates/UseTemplateModal";
import { createPackage, getPackage, updatePackage } from "@/lib/package-api";
import { applyPackageTemplate } from "@/lib/package-template-api";
import { PACKAGE_STEP_FIELDS } from "@/lib/package-types";
import type { PackageRecord, ReviewPublishData, UpdatePackageInput } from "@/lib/package-types";
import type { SupplierFormValues, PackageBasicsValues } from "@/lib/validation";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import { PACKAGE_STEP_PERMISSION_KEYS } from "@/lib/permission-types";

export default function AddPackagePage() {
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const [currentStep, setCurrentStep] = useState(1);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [packageData, setPackageData] = useState<PackageRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
  const templateAppliedRef = useRef(false);

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Packages", href: "/packages" },
    { label: packageId ? "Edit Package" : "Add Package" },
  ];

  useEffect(() => {
    const idParam = searchParams.get("id");
    const templateIdParam = searchParams.get("templateId");

    if (idParam) {
      const id = Number(idParam);
      if (Number.isNaN(id)) return;

      queueMicrotask(() => {
        setIsLoading(true);
        getPackage(id)
          .then((result) => {
            if (result.package) {
              setPackageId(result.package.id);
              setPackageData(result.package);
              setCurrentStep(result.package.current_step || 1);
            }
          })
          .catch((error) => {
            setSaveError(error instanceof Error ? error.message : "Failed to load package");
          })
          .finally(() => setIsLoading(false));
      });
      return;
    }

    if (templateIdParam && !idParam && !templateAppliedRef.current) {
      const templateId = Number(templateIdParam);
      if (!Number.isInteger(templateId) || templateId <= 0) return;

      templateAppliedRef.current = true;
      queueMicrotask(() => {
        void applyTemplateToNewPackage(templateId);
      });
    }
  }, [searchParams]);

  async function applyTemplateToNewPackage(templateId: number) {
    setIsApplyingTemplate(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const result = await applyPackageTemplate(templateId);
      const createPayload = {
        ...result.payload,
        current_step: result.current_step,
      };

      const created = await createPackage(createPayload);
      const saved = created.package;
      if (!saved) {
        throw new Error("No package returned from API");
      }

      setPackageId(saved.id);
      setPackageData(saved);
      setCurrentStep(saved.current_step || result.current_step);
      setAppliedTemplateName(result.template.name);
      setSaveSuccess(`Template "${result.template.name}" applied — start at step ${result.current_step}`);
      window.history.replaceState(null, "", `/add-package?id=${saved.id}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to apply template");
    } finally {
      setIsApplyingTemplate(false);
    }
  }

  const canAccessStep = (step: number) => {
    const key = PACKAGE_STEP_PERMISSION_KEYS[step];
    if (!key) return true;
    return can(key, "view");
  };

  const canEditStep = (step: number) => {
    const key = PACKAGE_STEP_PERMISSION_KEYS[step];
    if (!key) return true;
    return can(key, "edit");
  };

  const goToStep = (step: number) => {
    if (!canAccessStep(step)) {
      setSaveError("You do not have permission to view this module.");
      return;
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persistPackage = async (
    step: number,
    payload: UpdatePackageInput,
    nextStep?: number
  ) => {
    if (!canEditStep(step)) {
      setSaveError("You do not have permission to edit this module.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const updatePayload: UpdatePackageInput = {
        ...payload,
        current_step: nextStep ?? step,
      };

      const result = packageId
        ? await updatePackage(packageId, updatePayload)
        : await createPackage(updatePayload);

      const saved = result.package;
      if (!saved) {
        throw new Error("No package returned from API");
      }

      setPackageData(saved);

      if (!packageId) {
        setPackageId(saved.id);
        window.history.replaceState(null, "", `/add-package?id=${saved.id}`);
      }

      setSaveSuccess(`Step ${step} saved to fz.add_package`);

      if (nextStep) {
        goToStep(nextStep);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save package");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStepAndContinue = async (step: number, data?: unknown) => {
    const field = PACKAGE_STEP_FIELDS[step];
    const payload: UpdatePackageInput = field && data !== undefined ? { [field]: data } : {};
    await persistPackage(step, payload, step < 14 ? step + 1 : undefined);
  };

  const handleStepClick = (step: number) => {
    goToStep(step);
  };

  const handleSupplierNext = async (data: SupplierFormValues) => {
    await persistPackage(1, { supplier_source: data }, 2);
  };

  const handlePackageBasicsNext = async (data: PackageBasicsValues) => {
    await persistPackage(2, {
      package_basics: data,
      package_title: data.packageTitle,
      slug: data.slug,
    }, 3);
  };

  const handleReviewPublish = async (data: ReviewPublishData) => {
    if (data.submitAction === "save") {
      await saveStepAndContinue(14, data);
      return;
    }

    const status =
      data.submitAction === "publish" ? "published" : "pending_review";

    await persistPackage(
      14,
      {
        review_publish: data,
        status,
      },
      undefined
    );
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const renderStepForm = () => {
    switch (currentStep) {
      case 1:
        return (
          <SupplierForm
            initialData={packageData?.supplier_source ?? undefined}
            onNext={handleSupplierNext}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 2:
        return (
          <PackageBasicsForm
            initialData={packageData?.package_basics ?? undefined}
            onNext={handlePackageBasicsNext}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 3:
        return (
          <MediaFrontendForm
            initialData={packageData?.media_frontend ?? undefined}
            onNext={(data) => saveStepAndContinue(3, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 4:
        return (
          <PricingForm
            initialData={packageData?.pricing ?? undefined}
            onNext={(data) => saveStepAndContinue(4, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 5:
        return (
          <ItineraryForm
            initialData={packageData?.itinerary ?? undefined}
            packageDurationDays={packageData?.package_basics?.days}
            onNext={(data) => saveStepAndContinue(5, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 6:
        return (
          <HotelsForm
            initialData={packageData?.hotels ?? undefined}
            onNext={(data) => saveStepAndContinue(6, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 7:
        return (
          <InclusionsForm
            initialData={packageData?.inclusions ?? undefined}
            onNext={(data) => saveStepAndContinue(7, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 8:
        return (
          <BookingPolicyForm
            initialData={packageData?.booking_policy ?? undefined}
            onNext={(data) => saveStepAndContinue(8, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 9:
        return (
          <ConsultantViewForm
            initialData={packageData?.consultant_view ?? undefined}
            onNext={(data) => saveStepAndContinue(9, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 10:
        return (
          <SupplierQuoteTool
            initialData={packageData?.supplier_quote_tool ?? undefined}
            supplierSource={packageData?.supplier_source ?? undefined}
            packageId={packageData?.id ?? null}
            destination={
              [
                packageData?.package_basics?.countriesCovered,
                packageData?.package_basics?.citiesOrRegions,
              ]
                .filter(Boolean)
                .join(" · ") || ""
            }
            onNext={(data) => saveStepAndContinue(10, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 11:
        return (
          <FrontEndFaqsForm
            initialData={packageData?.frontend_faqs ?? undefined}
            onNext={(data) => saveStepAndContinue(11, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 12:
        return (
          <SalesAdsAssetsForm
            initialData={packageData?.sales_ads_assets ?? undefined}
            onNext={(data) => saveStepAndContinue(12, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 13:
        return (
          <SeoForm
            initialData={packageData?.seo ?? undefined}
            onNext={(data) => saveStepAndContinue(13, data)}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      case 14:
        return (
          <ReviewPublishForm
            initialData={packageData?.review_publish ?? undefined}
            onNext={handleReviewPublish}
            onPrevious={handlePrevious}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
    <AdminShell breadcrumbs={breadcrumbs}>
          <PageHeader
            currentStep={currentStep}
            packageTitle={packageData?.package_title}
            isEditing={Boolean(packageId)}
            onUseTemplate={() => setTemplateModalOpen(true)}
          />

          {(saveError || saveSuccess || packageId || isSaving || isLoading || isApplyingTemplate || appliedTemplateName) && (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              {isLoading && (
                <span className="text-gray-500">Loading package from API...</span>
              )}
              {isApplyingTemplate && (
                <span className="text-gray-500">Applying template and creating package...</span>
              )}
              {appliedTemplateName && !isApplyingTemplate && (
                <span className="px-3 py-1.5 rounded-lg bg-[#B48A2C]/10 text-[#9A7424] font-medium border border-[#B48A2C]/20">
                  Template: {appliedTemplateName}
                </span>
              )}
              {packageId && (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                  Package ID: {packageId}
                </span>
              )}
              {isSaving && (
                <span className="text-gray-500">Saving to fz.add_package...</span>
              )}
              {saveSuccess && !isSaving && (
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  {saveSuccess}
                </span>
              )}
              {saveError && (
                <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-100">
                  {saveError}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-6 xl:flex-row">
            <aside className="w-full flex-shrink-0 xl:w-[320px]">
              <div className="lg:sticky lg:top-20 space-y-4">
                <ProgressCard currentStep={currentStep} />
                <PackageAuditCard packageData={packageData} />
                <GuideCard onGuideClick={handleStepClick} />
                <Stepper
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                  canAccessStep={canAccessStep}
                />
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="transition-all duration-300 ease-in-out">
                {renderStepForm()}
              </div>
            </div>
          </div>
    </AdminShell>

      <UseTemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        applying={isApplyingTemplate}
        onApply={async (templateId) => {
          setTemplateModalOpen(false);
          await applyTemplateToNewPackage(templateId);
        }}
      />
    </>
  );
}
