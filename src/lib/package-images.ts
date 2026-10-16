import type { PackageRecord } from "./package-types";

/** Legacy site files are stored as "uploads/..." but served from the /backend/ folder. */
const DEFAULT_ASSET_BASE = "https://fayyaztravels.com/backend";
const LEGACY_UPLOADS_URL = /^https?:\/\/(?:www\.)?fayyaztravels\.com\/uploads\//i;
const LEGACY_UPLOADS_BASE = "https://fayyaztravels.com/backend/uploads/";
const ASSET_ROUTE = "/api/legacy-assets/";

export function normalizeLegacyImagePath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

/** Old absolute links point at fayyaztravels.com/uploads/, which 404s; the files live under /backend/uploads/. */
export function fixLegacyUploadUrl(url: string): string {
  return url.replace(LEGACY_UPLOADS_URL, LEGACY_UPLOADS_BASE);
}

/**
 * Browser src for a stored image path. Relative paths (legacy "uploads/..." or panel
 * "/uploads/...") go through the asset route, which serves panel uploads first and
 * falls back to the legacy site.
 */
export function resolveMediaSrc(path: string | null | undefined): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
  if (/^https?:/i.test(trimmed)) return fixLegacyUploadUrl(trimmed);
  return `${ASSET_ROUTE}${normalizeLegacyImagePath(trimmed)}`;
}

function mapImageSrcs(html: string, map: (src: string) => string): string {
  return html.replace(
    /(<img\b[^>]*?\ssrc=)(["'])(.*?)\2/gi,
    (_match, prefix: string, quote: string, src: string) => `${prefix}${quote}${map(src)}${quote}`
  );
}

/**
 * Rich-text HTML as stored → HTML whose images load inside the panel. Root-relative
 * "/uploads/..." images are shared by panel uploads and legacy files, so they go through
 * the asset route; reverse with fromEditorHtml before saving.
 */
export function toEditorHtml(html: string): string {
  if (!html) return html;
  return mapImageSrcs(html, (src) => {
    if (LEGACY_UPLOADS_URL.test(src)) return fixLegacyUploadUrl(src);
    if (src.startsWith("/uploads/")) return `${ASSET_ROUTE}${src.slice(1)}`;
    return src;
  });
}

export function fromEditorHtml(html: string): string {
  if (!html) return html;
  return mapImageSrcs(html, (src) =>
    src.startsWith(`${ASSET_ROUTE}uploads/`) ? `/${src.slice(ASSET_ROUTE.length)}` : src
  );
}

export function getLegacyAssetBaseUrl(): string {
  let fromVite: string | undefined;
  try {
    fromVite = import.meta.env?.VITE_LEGACY_ASSET_BASE_URL;
  } catch {
    fromVite = undefined;
  }
  const fromProcess =
    typeof process !== "undefined"
      ? process.env.LEGACY_ASSET_BASE_URL || process.env.VITE_LEGACY_ASSET_BASE_URL
      : undefined;
  const base = fromVite || fromProcess || DEFAULT_ASSET_BASE;

  return base.replace(/\/$/, "");
}

export function getPackageImagePath(pkg: PackageRecord): string | null {
  if (pkg.image_url) {
    return pkg.image_url;
  }

  const media = pkg.media_frontend;
  if (!media) return null;

  return (
    media.packageCardImage ||
    media.desktopHeroImage ||
    media.mobileHeroImage ||
    null
  );
}

export function resolvePackageImageUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;

  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return fixLegacyUploadUrl(trimmed);
  }

  const normalized = normalizeLegacyImagePath(trimmed);
  return `${getLegacyAssetBaseUrl()}/${normalized}`;
}

export function resolvePackageProxyUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;

  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `${ASSET_ROUTE}remote?url=${encodeURIComponent(fixLegacyUploadUrl(trimmed))}`;
  }

  const normalized = normalizeLegacyImagePath(trimmed);
  return `${ASSET_ROUTE}${normalized}`;
}

export function getPackageImageUrl(pkg: PackageRecord): string | null {
  if (pkg.image_url) {
    return resolvePackageImageUrl(pkg.image_url);
  }

  return resolvePackageImageUrl(getPackageImagePath(pkg));
}

export function getPackageImageSources(pkg: PackageRecord): string[] {
  const path = getPackageImagePath(pkg);
  if (!path) return [];

  const direct = resolvePackageImageUrl(path);
  const proxy = resolvePackageProxyUrl(path);

  if (!direct) return [];
  if (!proxy || proxy === direct) return [direct];
  return [direct, proxy];
}
