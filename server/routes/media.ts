import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
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

function kindFor(filename: string, mimetype: string): UploadKind | null {
  if (IMAGE_MIME.has(mimetype)) return "image";
  if (VIDEO_MIME.has(mimetype)) return "video";
  if (DOCUMENT_MIME.has(mimetype)) return "document";

  const ext = path.extname(filename).toLowerCase();
  if ([".pdf", ".doc", ".docx", ".xls", ".xlsx"].includes(ext)) return "document";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) return "image";
  if ([".mp4", ".webm", ".ogg", ".ogv", ".mov"].includes(ext)) return "video";
  return null;
}

function extensionFor(filename: string, mimetype: string): string {
  const fromName = path.extname(filename).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;

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
  return mimeMap[mimetype] ?? "";
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

      const folder = folderFor(kind);
      const dir = path.join(UPLOAD_ROOT, folder);
      await mkdir(dir, { recursive: true });

      const ext = extensionFor(file.filename, file.mimetype);
      const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
      const absolutePath = path.join(dir, storedName);

      await pipeline(file.file, createWriteStream(absolutePath));

      if (file.file.truncated) {
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
