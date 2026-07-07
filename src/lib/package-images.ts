import type { PackageRecord } from "./package-types";

const DEFAULT_ASSET_BASE = "https://fayyaztravels.com";

export function normalizeLegacyImagePath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

export function getLegacyAssetBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL ??
    process.env.LEGACY_ASSET_BASE_URL ??
    DEFAULT_ASSET_BASE;

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
