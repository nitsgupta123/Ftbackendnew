import fs from "node:fs";
import path from "node:path";

const roots = ["src"];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "app" && dir.endsWith("src")) continue; // skip old app after we migrate
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function transform(code, file) {
  let next = code;
  const original = code;

  // next/link
  next = next.replace(
    /import\s+Link\s+from\s+["']next\/link["'];?/g,
    'import { Link } from "react-router-dom";'
  );

  // next/image
  next = next.replace(
    /import\s+Image\s+from\s+["']next\/image["'];?\n?/g,
    ""
  );

  // Combine navigation imports from next → react-router
  next = next.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']next\/navigation["'];?/g,
    (_m, imports) => {
      const names = imports.split(",").map((s) => s.trim()).filter(Boolean);
      const mapped = [];
      if (names.includes("useRouter")) mapped.push("useNavigate");
      if (names.includes("usePathname")) mapped.push("useLocation");
      if (names.includes("useSearchParams")) mapped.push("useSearchParams");
      if (names.includes("useParams")) mapped.push("useParams");
      const unique = [...new Set(mapped)];
      if (unique.length === 0) return "";
      return `import { ${unique.join(", ")} } from "react-router-dom";`;
    }
  );

  // Merge duplicate react-router-dom imports
  const rrImports = [];
  next = next.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']react-router-dom["'];?\n?/g,
    (_m, imports) => {
      imports.split(",").map((s) => s.trim()).filter(Boolean).forEach((n) => {
        if (!rrImports.includes(n)) rrImports.push(n);
      });
      return "";
    }
  );
  if (rrImports.length) {
    next = `import { ${rrImports.join(", ")} } from "react-router-dom";\n` + next;
  }

  // useRouter → useNavigate pattern
  if (next.includes("useNavigate")) {
    next = next.replace(/const\s+router\s*=\s*useRouter\(\);?/g, "const navigate = useNavigate();");
    next = next.replace(/router\.push\(/g, "navigate(");
    next = next.replace(/router\.replace\(([^)]+)\)/g, "navigate($1, { replace: true })");
  }

  // usePathname → useLocation().pathname
  if (next.includes("useLocation") && next.includes("usePathname")) {
    next = next.replace(/const\s+pathname\s*=\s*usePathname\(\);?/g, "const { pathname } = useLocation();");
  } else if (next.includes("useLocation") && /usePathname\(\)/.test(next)) {
    next = next.replace(/usePathname\(\)/g, "useLocation().pathname");
  } else if (/usePathname\(\)/.test(next)) {
    // ensure useLocation imported
    if (!next.includes("useLocation")) {
      next = next.replace(
        /from "react-router-dom";/,
        (m) => m // already handled
      );
    }
    next = next.replace(/const\s+pathname\s*=\s*usePathname\(\);?/g, "const { pathname } = useLocation();");
  }

  // Link href → to (only for Link components - heuristic)
  next = next.replace(/<Link(\s[^>]*?)href=/g, "<Link$1to=");

  // Image → img
  next = next.replace(/<Image\b/g, "<img");
  next = next.replace(/\s+priority(?:=\{true\})?/g, "");
  next = next.replace(/\s+fill(?:=\{true\})?/g, "");
  next = next.replace(/\s+sizes=\{[^}]+\}/g, "");
  next = next.replace(/\s+unoptimized(?:=\{true\})?/g, "");

  // Remove "use client" directives (not needed in Vite)
  next = next.replace(/^["']use client["'];\s*\n/gm, "");

  // NEXT_PUBLIC_ → import.meta.env.VITE_ for client env
  next = next.replace(
    /process\.env\.NEXT_PUBLIC_API_URL/g,
    'import.meta.env.VITE_API_URL'
  );
  next = next.replace(
    /process\.env\.NEXT_PUBLIC_FRONTEND_URL/g,
    'import.meta.env.VITE_FRONTEND_URL'
  );
  next = next.replace(
    /process\.env\.NEXT_PUBLIC_AUDIT_USER/g,
    'import.meta.env.VITE_AUDIT_USER'
  );
  next = next.replace(
    /process\.env\.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL/g,
    'import.meta.env.VITE_LEGACY_ASSET_BASE_URL'
  );
  next = next.replace(
    /process\.env\.NEXT_PUBLIC_APP_URL/g,
    '(import.meta.env.VITE_APP_URL ?? process.env.APP_URL)'
  );

  if (next !== original) {
    fs.writeFileSync(file, next);
    return true;
  }
  return false;
}

const files = walk("src");
let changed = 0;
for (const file of files) {
  // include pages and components; also process lib
  const code = fs.readFileSync(file, "utf8");
  if (
    code.includes("next/") ||
    code.includes("NEXT_PUBLIC_") ||
    code.includes('"use client"') ||
    code.includes("'use client'")
  ) {
    if (transform(code, file)) {
      changed++;
      console.log("updated", file);
    }
  }
}
console.log(`Done. Updated ${changed} files.`);
