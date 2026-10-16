import type { PackageRecord } from "./package-types";

const DEFAULT_ASSET_BASE = "https://fayyaztravels.com";

export function normalizeLegacyImagePath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

/**
 * Browser src for a stored image path. Relative paths (legacy "uploads/..." or panel
 * "/uploads/...") go through the asset route, which serves panel uploads first and
 * falls back to the legacy site.
 */
export function resolveMediaSrc(path: string | null | undefined): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `/api/legacy-assets/${normalizeLegacyImagePath(trimmed)}`;
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
    return trimmed;
  }

  const normalized = normalizeLegacyImagePath(trimmed);
  return `${getLegacyAssetBaseUrl()}/${normalized}`;
}

export function resolvePackageProxyUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;

  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `/api/legacy-assets/remote?url=${encodeURIComponent(trimmed)}`;
  }

  const normalized = normalizeLegacyImagePath(trimmed);
  return `/api/legacy-assets/${normalized}`;
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
