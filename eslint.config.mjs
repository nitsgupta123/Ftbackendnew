import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "public/tinymce/**", "node_modules/**", ".next/**"],
  },
]);
