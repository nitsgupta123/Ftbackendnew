import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const REMOTE_FETCH_TIMEOUT_MS = 10_000;
const REMOTE_MAX_BYTES = 15 * 1024 * 1024;

function getLegacyAssetBaseUrl() {
  const base = process.env.LEGACY_ASSET_BASE_URL ?? "https://fayyaztravels.com/";
  return base.endsWith("/") ? base : `${base}/`;
}

function getLegacyAssetRootPath() {
  return process.env.LEGACY_ASSET_ROOT_PATH?.trim() || null;
}

function normalizeAssetPath(assetPath: string) {
  return decodeURIComponent(assetPath).replace(/^\/+/, "");
}

function isPathInside(root: string, candidate: string): boolean {
  const rootResolved = path.resolve(root);
  const absolutePath = path.resolve(candidate);
  const rootWithSep = rootResolved.endsWith(path.sep)
    ? rootResolved
    : `${rootResolved}${path.sep}`;
  return absolutePath === rootResolved || absolutePath.startsWith(rootWithSep);
}

function buildRemoteAssetUrl(assetPath: string) {
  const normalized = normalizeAssetPath(assetPath);
  const segments = normalized.split("/").map((segment) => encodeURIComponent(segment));
  return new URL(segments.join("/"), getLegacyAssetBaseUrl()).toString();
}

function isAllowedRemoteUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const allowed = new URL(getLegacyAssetBaseUrl());
  return parsed.hostname.toLowerCase() === allowed.hostname.toLowerCase();
}

/** Files uploaded through this panel live in ./uploads and are referenced as "/uploads/...". */
const PANEL_ROOT = process.cwd();

async function readLocalAsset(assetPath: string) {
  if (normalizeAssetPath(assetPath).startsWith("uploads/")) {
    const own = await readAssetFromRoot(PANEL_ROOT, assetPath);
    if (own) return own;
  }
  const root = getLegacyAssetRootPath();
  if (!root) return null;
  return readAssetFromRoot(root, assetPath);
}

async function readAssetFromRoot(root: string, assetPath: string) {
  const normalized = normalizeAssetPath(assetPath);
  if (!normalized || normalized.includes("\0") || normalized.split(/[/\\]/).includes("..")) {
    return null;
  }

  const absolutePath = path.resolve(root, normalized);
  if (!isPathInside(root, absolutePath)) {
    return null;
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    return {
      buffer,
      contentType: MIME_TYPES[ext] ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

async function fetchRemoteAsset(sourceUrl: string) {
  if (!isAllowedRemoteUrl(sourceUrl)) {
    return null;
  }

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "image/*,*/*",
      "User-Agent": "ftadmin/1.0",
    },
    redirect: "error",
    signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return null;
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > REMOTE_MAX_BYTES) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > REMOTE_MAX_BYTES) {
    return null;
  }

  return { buffer, contentType };
}

export const registerLegacyAssetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/remote", async (request, reply) => {
    try {
      const { url } = request.query as { url?: string };
      if (!url) {
        return reply.status(400).send({ error: "Image url is required" });
      }

      const remote = await fetchRemoteAsset(url);
      if (!remote) {
        return reply.status(404).send({ error: "Asset not found" });
      }

      return reply
        .header("Content-Type", remote.contentType)
        .header("Cache-Control", "public, max-age=3600")
        .header("X-Content-Type-Options", "nosniff")
        .send(remote.buffer);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch legacy asset"),
      });
    }
  });

  app.get("/*", async (request, reply) => {
    try {
      const assetPath = (request.params as { "*": string })["*"];
      if (!assetPath) {
        return reply.status(400).send({ error: "Asset path is required" });
      }

      const local = await readLocalAsset(assetPath);
      if (local) {
        return reply
          .header("Content-Type", local.contentType)
          .header("Cache-Control", "public, max-age=3600")
          .header("X-Content-Type-Options", "nosniff")
          .send(local.buffer);
      }

      const sourceUrl = buildRemoteAssetUrl(assetPath);
      const remote = await fetchRemoteAsset(sourceUrl);
      if (!remote) {
        return reply.status(404).send({ error: "Asset not found" });
      }

      return reply
        .header("Content-Type", remote.contentType)
        .header("Cache-Control", "public, max-age=3600")
        .header("X-Content-Type-Options", "nosniff")
        .send(remote.buffer);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch legacy asset"),
      });
    }
  });
};
