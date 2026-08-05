"use client";

import Image from "next/image";
import { Icon } from "@/components/ui/icons";
import type { BlogPostRecord } from "@/lib/blog-types";
import { formatPackageDateTime, formatPackageDateTimeSgt } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BlogDetailsModalProps {
  post: BlogPostRecord | null;
  onClose: () => void;
}

export default function BlogDetailsModal({ post, onClose }: BlogDetailsModalProps) {
  if (!post) return null;

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
          <h2 className="text-lg font-bold text-gray-900 pr-4">{post.title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/blogs/edit/${post.id}`}
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
          {post.featured_image_path && (
            <Image
              src={post.featured_image_path}
              alt={post.title}
              width={768}
              height={240}
              unoptimized
              className="w-full h-48 object-cover rounded-xl border border-[#E5E7EB]"
            />
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Slug</dt>
              <dd className="mt-0.5 font-mono text-gray-900">{post.slug}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
              <dd className="mt-0.5 capitalize text-gray-900">{post.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Category</dt>
              <dd className="mt-0.5 text-gray-900">{post.category_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Author</dt>
              <dd className="mt-0.5 text-gray-900">{post.author_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Featured</dt>
              <dd className="mt-0.5 text-gray-900">{post.is_featured ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Published</dt>
              <dd className="mt-0.5 text-gray-900">
                {post.published_at ? formatPackageDateTimeSgt(post.published_at) : "—"}
              </dd>
            </div>
          </dl>

          {post.excerpt && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Excerpt</h3>
              <p className="text-sm text-gray-700">{post.excerpt}</p>
            </div>
          )}

          {post.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {post.content && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Content Preview</h3>
              <div
                className="blog-content-preview prose prose-sm max-w-none text-gray-700 border border-[#E5E7EB] rounded-xl p-4 bg-gray-50/50"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          )}

          {(post.seo_meta_title || post.seo_meta_description) && (
            <div className="border-t border-[#E5E7EB] pt-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">SEO</h3>
              {post.seo_meta_title && (
                <p className="text-sm text-gray-900 font-medium">{post.seo_meta_title}</p>
              )}
              {post.seo_meta_description && (
                <p className="text-sm text-gray-600 mt-1">{post.seo_meta_description}</p>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400 border-t border-[#E5E7EB] pt-4">
            Created by {post.created_by ?? "—"} · Updated {formatPackageDateTime(post.updated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
