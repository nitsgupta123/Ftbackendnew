import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "tinymce");
const destination = join(root, "public", "tinymce");

if (!existsSync(source)) {
  console.warn("[copy-tinymce] tinymce package not found, skipping.");
  process.exit(0);
}

if (existsSync(destination)) {
  rmSync(destination, { recursive: true, force: true });
}

cpSync(source, destination, { recursive: true });
console.log("[copy-tinymce] Copied TinyMCE assets to public/tinymce");
