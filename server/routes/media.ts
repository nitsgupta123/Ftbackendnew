import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

type UploadKind = "image" | "video" | "document";

const EXTENSIONS_BY_KIND: Record<UploadKind, string[]> = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  video: [".mp4", ".webm", ".ogg", ".ogv", ".mov"],
  document: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
};

function kindFor(filename: string, mimetype: string): UploadKind | null {
  if (IMAGE_MIME.has(mimetype)) return "image";
  if (VIDEO_MIME.has(mimetype)) return "video";
  if (DOCUMENT_MIME.has(mimetype)) return "document";

  const ext = path.extname(filename).toLowerCase();
  if (EXTENSIONS_BY_KIND.document.includes(ext)) return "document";
  if (EXTENSIONS_BY_KIND.image.includes(ext)) return "image";
  if (EXTENSIONS_BY_KIND.video.includes(ext)) return "video";
  return null;
}

/**
 * The stored extension decides the Content-Type /uploads is served with, so it must come
 * from the allow-list for the accepted kind — never from an arbitrary client filename
 * (e.g. `x.html` sent as image/png would otherwise be served as HTML).
 */
function extensionFor(filename: string, mimetype: string, kind: UploadKind): string | null {
  const fromName = path.extname(filename).toLowerCase();
  if (EXTENSIONS_BY_KIND[kind].includes(fromName)) return fromName;

  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  };
  const fromMime = mimeMap[mimetype];
  return fromMime && EXTENSIONS_BY_KIND[kind].includes(fromMime) ? fromMime : null;
}

function folderFor(kind: UploadKind): string {
  if (kind === "image") return "images";
  if (kind === "video") return "videos";
  return "documents";
}

export const registerMediaRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.post("/upload", async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const kind = kindFor(file.filename, file.mimetype);
      if (!kind) {
        return reply.status(400).send({
          error:
            "Unsupported file type. Upload an image, video, or document (pdf, doc, docx, xls, xlsx).",
        });
      }

      const ext = extensionFor(file.filename, file.mimetype, kind);
      if (!ext) {
        return reply.status(400).send({
          error: "File extension does not match an allowed image, video, or document type.",
        });
      }

      const folder = folderFor(kind);
      const dir = path.join(UPLOAD_ROOT, folder);
      await mkdir(dir, { recursive: true });

      const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
      const absolutePath = path.join(dir, storedName);

      await pipeline(file.file, createWriteStream(absolutePath));

      if (file.file.truncated) {
        await unlink(absolutePath).catch(() => undefined);
        return reply.status(400).send({ error: "Upload aborted or file too large" });
      }

      const info = await stat(absolutePath);
      const url = `/uploads/${folder}/${storedName}`;
      return reply.send({
        url,
        kind,
        filename: file.filename,
        mimetype: file.mimetype,
        size: info.size,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to upload file"),
      });
    }
  });
};
