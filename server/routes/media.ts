import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyPluginAsync } from "fastify";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

function extensionFor(filename: string, mimetype: string): string {
  const fromName = path.extname(filename).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;

  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
  };
  return mimeMap[mimetype] ?? "";
}

export const registerMediaRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post("/upload", async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const kind = IMAGE_MIME.has(file.mimetype)
        ? "image"
        : VIDEO_MIME.has(file.mimetype)
          ? "video"
          : null;

      if (!kind) {
        return reply.status(400).send({
          error: "Unsupported file type. Upload an image (jpg, png, gif, webp) or video (mp4, webm, ogg).",
        });
      }

      const folder = kind === "image" ? "images" : "videos";
      const dir = path.join(UPLOAD_ROOT, folder);
      await mkdir(dir, { recursive: true });

      const ext = extensionFor(file.filename, file.mimetype);
      const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
      const absolutePath = path.join(dir, storedName);

      await pipeline(file.file, createWriteStream(absolutePath));

      if (file.file.truncated) {
        return reply.status(400).send({ error: "Upload aborted or file too large" });
      }

      const url = `/uploads/${folder}/${storedName}`;
      return reply.send({
        url,
        kind,
        filename: file.filename,
        mimetype: file.mimetype,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to upload file",
      });
    }
  });
};
