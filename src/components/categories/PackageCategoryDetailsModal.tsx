"use client";

import { Icon } from "@/components/ui/icons";
import type { PackageCategoryRecord } from "@/lib/category-types";
import { formatPackageDateTime } from "@/lib/format-date";import { Button } from "@/components/ui/button";
import Image from "next/image";

interface PackageCategoryDetailsModalProps {
  category: PackageCategoryRecord | null;
  onClose: () => void;
  onEdit?: (category: PackageCategoryRecord) => void;
}

export default function PackageCategoryDetailsModal({
  category,
  onClose,
  onEdit
}: PackageCategoryDetailsModalProps) {
  if (!category) return null;

  const imageSrc = category.image_path || category.icon_path;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB]">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
          <Button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {imageSrc &&
          <Image
            src={imageSrc}
            alt={category.name}
            width={768}
            height={160}
            unoptimized
            className="w-full h-40 object-cover rounded-xl border border-[#E5E7EB]" />

          }

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Slug</dt>
              <dd className="mt-0.5 font-mono text-gray-900">{category.slug}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
              <dd className="mt-0.5 capitalize text-gray-900">{category.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Display Order</dt>
              <dd className="mt-0.5 text-gray-900">{category.display_order}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Featured</dt>
              <dd className="mt-0.5 text-gray-900">{category.is_featured ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Total Packages</dt>
              <dd className="mt-0.5 text-gray-900">{category.total_packages ?? 0}</dd>
            </div>
          </dl>

          {category.description &&
          <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{category.description}</p>
            </div>
          }

          {(category.seo_meta_title || category.seo_meta_description) &&
          <div className="border-t border-[#E5E7EB] pt-4">
              <h3 className="text-sm font-bold text-[#1F2A44] mb-2">SEO</h3>
              {category.seo_meta_title &&
            <p className="text-sm text-gray-700">
                  <span className="font-medium">Title:</span> {category.seo_meta_title}
                </p>
            }
              {category.seo_meta_description &&
            <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Description:</span> {category.seo_meta_description}
                </p>
            }
            </div>
          }

          <div className="border-t border-[#E5E7EB] pt-4">
            <h3 className="text-sm font-bold text-[#1F2A44] mb-2">Audit Trail</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Created By</dt>
                <dd className="text-gray-900">{category.created_by ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created At</dt>
                <dd className="text-gray-900">{formatPackageDateTime(category.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Updated By</dt>
                <dd className="text-gray-900">{category.updated_by ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Updated At</dt>
                <dd className="text-gray-900">{formatPackageDateTime(category.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-gray-50/80">
          <Button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-gray-700 hover:bg-white">
            
            Close
          </Button>
          {onEdit &&
          <Button
            type="button"
            onClick={() => onEdit(category)}
            className="h-10 px-4 rounded-lg text-sm font-semibold text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90">
            
              Edit Category
            </Button>
          }
        </div>
      </div>
    </div>);

}
