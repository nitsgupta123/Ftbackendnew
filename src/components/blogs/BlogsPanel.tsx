"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import BlogListTable from "@/components/blogs/BlogListTable";
import BlogDetailsModal from "@/components/blogs/BlogDetailsModal";
import WriteNewBlogLink from "@/components/blogs/WriteNewBlogLink";
import { getBlogStats, listBlogAuthors, listBlogPosts } from "@/lib/blog-api";
import {
  BLOG_SORT_OPTIONS,
  BLOG_STATUS_FILTER_OPTIONS,
  type BlogPostRecord,
  type BlogPostStatus,
  type BlogStats,
  type BlogStatusFilter,
} from "@/lib/blog-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const GOLD = "#A68231";

const filterControlClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";

interface BlogsPanelProps {
  defaultStatus?: BlogPostStatus;
  hideStatusFilter?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: accent ? `${accent}14` : `${GOLD}14`,
          color: accent ?? GOLD,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-[#1F2A44] leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function BlogsPanel({ defaultStatus, hideStatusFilter = false }: BlogsPanelProps) {
  const { can } = usePermissions();
  const canDelete = can("blogs", "delete");

  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BlogStatusFilter>(defaultStatus ?? "all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [authors, setAuthors] = useState<string[]>([]);
  const [sort, setSort] = useState<"published_at" | "created_at" | "title" | "author_name">(
    "created_at"
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [viewingPost, setViewingPost] = useState<BlogPostRecord | null>(null);
  const limit = 20;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getBlogStats();
      setStats(result);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAuthors = useCallback(async () => {
    try {
      const result = await listBlogAuthors();
      setAuthors(result);
    } catch {
      // Fallback: collect distinct authors from a wide posts query
      try {
        const fallback = await listBlogPosts({ limit: 100, sort: "author_name", order: "asc" });
        const names = [
          ...new Set(
            fallback.posts
              .map((post) => post.author_name?.trim())
              .filter((name): name is string => Boolean(name))
          ),
        ].sort((a, b) => a.localeCompare(b));
        setAuthors(names);
      } catch {
        setAuthors([]);
      }
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBlogPosts({
        search: search.trim() || undefined,
        status: statusFilter,
        author_name: authorFilter !== "all" ? authorFilter : undefined,
        sort,
        order,
        page,
        limit,
      });
      setPosts(result.posts);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      // Keep author chips in sync with names seen on posts
      setAuthors((prev) => {
        const fromPosts = result.posts
          .map((post) => post.author_name?.trim())
          .filter((name): name is string => Boolean(name));
        if (fromPosts.length === 0) return prev;
        return [...new Set([...prev, ...fromPosts])].sort((a, b) => a.localeCompare(b));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, authorFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
      void loadAuthors();
      void loadPosts();
    });
  }, [loadStats, loadAuthors, loadPosts]);

  useEffect(() => {
    setStatusFilter(defaultStatus ?? "all");
    setPage(1);
  }, [defaultStatus]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No posts match "${search.trim()}".`;
    if (authorFilter !== "all") return `No posts found for author "${authorFilter}".`;
    if (statusFilter !== "all") {
      const label =
        BLOG_STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
      return `No ${label.toLowerCase()} posts found.`;
    }
    return "No blog posts found. Write your first post to get started.";
  }, [search, statusFilter, authorFilter]);

  const featuredOnPage = useMemo(
    () => posts.filter((post) => post.is_featured).length,
    [posts]
  );

  const statCards = useMemo(() => {
    const busy = loading || statsLoading;

    if (defaultStatus === "published") {
      return [
        {
          label: "Published Posts",
          value: busy ? "—" : total,
          icon: "CheckCircle",
          accent: "#27AE60",
        },
        {
          label: "Featured Posts",
          value: busy ? "—" : featuredOnPage,
          icon: "Star",
        },
        {
          label: "All Blog Posts",
          value: busy ? "—" : (stats?.total ?? 0),
          icon: "FileStack",
        },
      ];
    }

    if (defaultStatus === "draft") {
      return [
        { label: "Draft Posts", value: busy ? "—" : total, icon: "FileText" },
        {
          label: "Published",
          value: busy ? "—" : (stats?.published ?? 0),
          icon: "CheckCircle",
          accent: "#27AE60",
        },
        {
          label: "Archived",
          value: busy ? "—" : (stats?.archived ?? 0),
          icon: "Archive",
        },
      ];
    }

    if (defaultStatus === "archived") {
      return [
        { label: "Archived Posts", value: busy ? "—" : total, icon: "Archive" },
        {
          label: "Published",
          value: busy ? "—" : (stats?.published ?? 0),
          icon: "CheckCircle",
          accent: "#27AE60",
        },
        { label: "Draft Posts", value: busy ? "—" : (stats?.draft ?? 0), icon: "FileText" },
      ];
    }

    return [
      { label: "Total Posts", value: busy ? "—" : (stats?.total ?? total), icon: "FileText" },
      {
        label: "Published",
        value: busy ? "—" : (stats?.published ?? 0),
        icon: "CheckCircle",
        accent: "#27AE60",
      },
      { label: "Draft Posts", value: busy ? "—" : (stats?.draft ?? 0), icon: "Pencil" },
    ];
  }, [defaultStatus, loading, statsLoading, total, stats, featuredOnPage]);

  const createHref = "/blogs/new";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, excerpt, or author..."
              className={`w-full pl-9 pr-3 ${filterControlClass}`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {!hideStatusFilter && (
              <NativeSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as BlogStatusFilter);
                  setPage(1);
                }}
                wrapperClassName="w-auto shrink-0"
                className={`min-w-[130px] px-3 pr-9 ${filterControlClass}`}
              >
                {BLOG_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            )}

            <NativeSelect
              value={authorFilter}
              onChange={(e) => {
                setAuthorFilter(e.target.value);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[150px] px-3 pr-9 ${filterControlClass}`}
            >
              <option value="all">All authors</option>
              {authors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "published_at" | "created_at" | "title" | "author_name")
              }
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[150px] px-3 pr-9 ${filterControlClass}`}
            >
              {BLOG_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[120px] px-3 pr-9 ${filterControlClass}`}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </NativeSelect>
          </div>

          <WriteNewBlogLink href={createHref} className="sm:ml-auto" />
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC]">
          <p className="text-xs text-gray-500">
            {loading ? (
              "Loading blog posts…"
            ) : total > 0 ? (
              <>
                Showing <span className="font-medium text-gray-700">{posts.length}</span> of{" "}
                <span className="font-medium text-gray-700">{total}</span> posts
              </>
            ) : (
              "No posts to display"
            )}
          </p>
        </div>

        <BlogListTable
          posts={posts}
          loading={loading}
          emptyMessage={emptyMessage}
          canDelete={canDelete}
          onView={setViewingPost}
          createHref={createHref}
          onPostRemoved={(id) => {
            setPosts((prev) => prev.filter((p) => p.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            void loadAuthors();
          }}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E8ECF0] bg-[#FAFBFC]">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
              >
                <Icon name="ChevronLeft" size={16} className="mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
              >
                Next
                <Icon name="ChevronRight" size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <BlogDetailsModal post={viewingPost} onClose={() => setViewingPost(null)} />
    </>
  );
}
