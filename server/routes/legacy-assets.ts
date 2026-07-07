import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

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

function buildRemoteAssetUrl(assetPath: string) {
  const normalized = normalizeAssetPath(assetPath);
  const segments = normalized.split("/").map((segment) => encodeURIComponent(segment));
  return new URL(segments.join("/"), getLegacyAssetBaseUrl()).toString();
}

async function readLocalAsset(assetPath: string) {
  const root = getLegacyAssetRootPath();
  if (!root) return null;

  const normalized = normalizeAssetPath(assetPath);
  const absolutePath = path.resolve(root, normalized);
  const rootResolved = path.resolve(root);

  if (!absolutePath.startsWith(rootResolved)) {
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
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "image/*,*/*",
      "User-Agent": "ftadmin/1.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

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
        .send(remote.buffer);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch legacy asset",
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
        .send(remote.buffer);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to fetch legacy asset",
      });
    }
  });
};
