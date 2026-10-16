import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icons";
import type { CmsPageRecord } from "@/lib/page-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Button } from "@/components/ui/button";
import { resolveMediaSrc, toEditorHtml } from "@/lib/package-images";


interface PageDetailsModalProps {
  page: CmsPageRecord | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 ring-amber-600/20",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  archived: "bg-gray-100 text-gray-600 ring-gray-500/10",
};

export default function PageDetailsModal({ page, onClose }: PageDetailsModalProps) {
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB]">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900 pr-4">{page.title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/pages/edit/${page.id}`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm text-[#B48A2C] hover:bg-gray-50"
            >
              <Icon name="Pencil" size={14} />
              Edit
            </Link>
            <Button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {page.featured_image_path && (
            <img
              src={resolveMediaSrc(page.featured_image_path)}
              alt={page.title}
              width={768}
              height={240}
              className="w-full h-48 object-cover rounded-xl border border-[#E5E7EB]"
            />
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Slug</dt>
              <dd className="mt-0.5 font-mono text-gray-900">{page.slug}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
                    STATUS_STYLES[page.status] ?? STATUS_STYLES.draft
                  }`}
                >
                  {page.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Page Type</dt>
              <dd className="mt-0.5 text-gray-900">
                {page.page_type ? (
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                    {page.page_type}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Show in Nav</dt>
              <dd className="mt-0.5 text-gray-900">
                {page.show_in_nav ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Yes
                  </span>
                ) : (
                  "No"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Display Order</dt>
              <dd className="mt-0.5 text-gray-900">{page.display_order}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Published</dt>
              <dd className="mt-0.5 text-gray-900">
                {page.published_at ? formatPackageDateTime(page.published_at) : "—"}
              </dd>
            </div>
          </dl>

          {page.excerpt && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Excerpt</h3>
              <p className="text-sm text-gray-700">{page.excerpt}</p>
            </div>
          )}

          {page.content && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Content Preview</h3>
              <div
                className="prose prose-sm max-w-none text-gray-700 border border-[#E5E7EB] rounded-xl p-4 bg-gray-50/50"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(toEditorHtml(page.content)) }}
              />
            </div>
          )}

          {(page.seo_meta_title || page.seo_meta_description) && (
            <div className="border-t border-[#E5E7EB] pt-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">SEO</h3>
              {page.seo_meta_title && (
                <p className="text-sm text-gray-900 font-medium">{page.seo_meta_title}</p>
              )}
              {page.seo_meta_description && (
                <p className="text-sm text-gray-600 mt-1">{page.seo_meta_description}</p>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400 border-t border-[#E5E7EB] pt-4">
            Created by {page.created_by ?? "—"} · Updated {formatPackageDateTime(page.updated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
