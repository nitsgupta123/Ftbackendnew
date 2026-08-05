"use client";

import { useState } from "react";
import Link from "next/link";
import WriteNewBlogLink from "@/components/blogs/WriteNewBlogLink";
import { Icon } from "@/components/ui/icons";
import { deleteBlogPost } from "@/lib/blog-api";
import type { BlogPostRecord } from "@/lib/blog-types";
import { formatPackageDateTime, formatPackageDateTimeSgt } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const GOLD = "#A68231";

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  draft: {
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  scheduled: {
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
  },
  published: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  archived: {
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10",
    dot: "bg-gray-400",
  },
};

interface BlogListTableProps {
  posts: BlogPostRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  createHref?: string;
  onView?: (post: BlogPostRecord) => void;
  onPostRemoved?: (id: number) => void;
}

function BlogRowActions({
  post,
  canDelete,
  onView,
  onPostRemoved,
}: {
  post: BlogPostRecord;
  canDelete?: boolean;
  onView?: (post: BlogPostRecord) => void;
  onPostRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      await deleteBlogPost(post.id);
      onPostRemoved?.(post.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete blog post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(post)}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 transition-colors"
        title="View post"
      >
        <Icon name="Eye" size={15} />
      </Button>
      <Link
        href={`/blogs/edit/${post.id}`}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 transition-colors"
        title="Edit post"
      >
        <Icon name="Pencil" size={15} />
      </Link>
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-40 transition-colors"
          title="Delete post"
        >
          <Icon name="Trash2" size={15} />
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-[#F1F5F9]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function BlogListTable({
  posts,
  loading = false,
  emptyMessage = "No blog posts found.",
  canDelete = false,
  createHref = "/blogs/new",
  onView,
  onPostRemoved,
}: BlogListTableProps) {
  const resolvePublishedByName = (post: BlogPostRecord) =>
    post.created_by ?? post.author_name ?? "—";

  const resolveUpdatedByName = (post: BlogPostRecord) =>
    post.updated_by ?? post.created_by ?? post.author_name ?? "—";

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!posts.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl ring-1 mb-4"
          style={{ backgroundColor: `${GOLD}10`, color: GOLD, borderColor: `${GOLD}25` }}
        >
          <Icon name="FileText" size={24} />
        </div>
        <p className="text-sm font-medium text-gray-700">{emptyMessage}</p>
        <WriteNewBlogLink href={createHref} className="mt-4" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Post
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
              Category
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
              Author
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">
              Published
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden xl:table-cell">
              Updated
            </TableHead>
            <TableHead className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
          {posts.map((post) => {
            const statusStyle = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;

            return (
              <TableRow key={post.id} className="group hover:bg-[#FFFCF7]/60 transition-colors">
                <TableCell className="px-4 py-3.5">
                  <div className="min-w-[220px]">
                    <p className="font-medium text-[#1F2A44] truncate max-w-[280px] group-hover:text-[#A68231] transition-colors">
                      {post.title}
                    </p>
                      <p className="mt-0.5 text-xs text-gray-400 font-mono truncate max-w-[280px]">
                        /{post.slug}
                      </p>
                      {post.is_featured && (
                        <span
                          className="inline-flex items-center gap-1 mt-1 text-xs font-medium"
                          style={{ color: GOLD }}
                        >
                          <Icon name="Star" size={12} />
                          Featured
                        </span>
                      )}
                      <p className="mt-1 text-xs text-gray-500 md:hidden truncate">
                        {post.category_name ?? "Uncategorized"}
                        {post.author_name ? ` · ${post.author_name}` : ""}
                      </p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5 hidden md:table-cell">
                  {post.category_name ? (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {post.category_name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-600 hidden lg:table-cell">
                  {post.author_name ?? post.created_by ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    {post.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-500 text-xs hidden sm:table-cell">
                  <div className="space-y-0.5">
                    <p>{post.published_at ? formatPackageDateTimeSgt(post.published_at) : "—"}</p>
                    <p className="text-[11px] text-gray-400">By {resolvePublishedByName(post)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-500 text-xs hidden xl:table-cell">
                  <div className="space-y-0.5">
                    <p>{formatPackageDateTime(post.updated_at)}</p>
                    <p className="text-[11px] text-gray-400">By {resolveUpdatedByName(post)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <BlogRowActions
                    post={post}
                    canDelete={canDelete}
                    onView={onView}
                    onPostRemoved={onPostRemoved}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
