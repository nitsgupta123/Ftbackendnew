import type { BlogPostStatus } from "./blog-types";

export interface BlogModuleConfig {
  slug: string;
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  status?: BlogPostStatus;
  endpoint?: "list" | "categories";
}

export const BLOG_MODULES: Record<string, BlogModuleConfig> = {
  all: {
    slug: "all",
    title: "All Blog Posts",
    description: "Browse every blog post across draft, published, and archived states.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Blogs", href: "/blogs/all" },
      { label: "All Posts" },
    ],
    endpoint: "list",
  },
  drafts: {
    slug: "drafts",
    title: "Draft Posts",
    description: "Blog posts still being written or awaiting review.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Blogs", href: "/blogs/all" },
      { label: "Drafts" },
    ],
    status: "draft",
    endpoint: "list",
  },
  published: {
    slug: "published",
    title: "Published Posts",
    description: "Live blog posts visible on the Fayyaz Travels website.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Blogs", href: "/blogs/all" },
      { label: "Published" },
    ],
    status: "published",
    endpoint: "list",
  },
  archived: {
    slug: "archived",
    title: "Archived Posts",
    description: "Retired blog posts kept for reference.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Blogs", href: "/blogs/all" },
      { label: "Archived" },
    ],
    status: "archived",
    endpoint: "list",
  },
  categories: {
    slug: "categories",
    title: "Blog Categories",
    description: "Organize blog posts into categories for navigation and SEO.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Blogs", href: "/blogs/all" },
      { label: "Categories" },
    ],
    endpoint: "categories",
  },
};

export const BLOG_MODULE_SLUGS = Object.keys(BLOG_MODULES);
