import type { PageStatus } from "./page-types";

export interface PageModuleConfig {
  slug: string;
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  status?: PageStatus;
}

export const PAGE_MODULES: Record<string, PageModuleConfig> = {
  all: {
    slug: "all",
    title: "All Pages",
    description: "Browse every CMS page across draft, published, and archived states.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Pages", href: "/pages/all" },
      { label: "All Pages" },
    ],
  },
  drafts: {
    slug: "drafts",
    title: "Draft Pages",
    description: "Pages still being written or awaiting review before publishing.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Pages", href: "/pages/all" },
      { label: "Drafts" },
    ],
    status: "draft",
  },
  published: {
    slug: "published",
    title: "Published Pages",
    description: "Live pages visible on the Fayyaz Travels website.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Pages", href: "/pages/all" },
      { label: "Published" },
    ],
    status: "published",
  },
  archived: {
    slug: "archived",
    title: "Archived Pages",
    description: "Retired pages kept for reference.",
    breadcrumbs: [
      { label: "Dashboard", href: "/" },
      { label: "Pages", href: "/pages/all" },
      { label: "Archived" },
    ],
    status: "archived",
  },
};

export const PAGE_MODULE_SLUGS = Object.keys(PAGE_MODULES);
