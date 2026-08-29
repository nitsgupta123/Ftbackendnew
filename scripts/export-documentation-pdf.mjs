import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked } from "marked";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputName = process.argv[2] || "DOCUMENTATION.md";
const mdPath = path.resolve(root, inputName);
const pdfPath = path.resolve(
  root,
  process.argv[3] || inputName.replace(/\.md$/i, ".pdf")
);
const isFeatures = path.basename(mdPath).toLowerCase().startsWith("features");
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

marked.setOptions({ gfm: true, breaks: false });

const markdown = readFileSync(mdPath, "utf8");
const body = marked.parse(markdown);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${isFeatures ? "Fayyaz Travels Admin — How Every Feature Works" : "Fayyaz Travels Admin — Technical Documentation"}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 18mm 14mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #1a1d23;
      font: 10.5pt/1.45 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }
    .cover {
      border: 2px solid #1f4e79;
      padding: 28mm 14mm;
      margin-bottom: 18mm;
      page-break-after: always;
      text-align: left;
    }
    .cover .kicker {
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 10pt;
      color: #1f4e79;
      font-weight: 700;
      margin: 0 0 12mm;
    }
    .cover h1 {
      font-size: 26pt;
      line-height: 1.2;
      margin: 0 0 6mm;
      color: #12263a;
      border: 0;
      page-break-before: auto;
    }
    .cover .subtitle {
      font-size: 13pt;
      color: #44505c;
      margin: 0 0 14mm;
    }
    .cover dl {
      display: grid;
      grid-template-columns: 42mm 1fr;
      gap: 3mm 6mm;
      margin: 0;
    }
    .cover dt { font-weight: 700; color: #1f4e79; }
    .cover dd { margin: 0; }
    h1 {
      font-size: 18pt;
      color: #12263a;
      border-bottom: 2px solid #1f4e79;
      padding-bottom: 3mm;
      margin: 10mm 0 5mm;
      page-break-before: always;
      page-break-after: avoid;
    }
    h1:first-of-type { page-break-before: auto; }
    h2 {
      font-size: 13.5pt;
      color: #1f4e79;
      margin: 8mm 0 3mm;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11.5pt;
      color: #2b4c6f;
      margin: 6mm 0 2mm;
      page-break-after: avoid;
    }
    h4 {
      font-size: 10.5pt;
      margin: 4mm 0 2mm;
      page-break-after: avoid;
    }
    p, ul, ol { margin: 0 0 3mm; }
    a { color: #1f4e79; text-decoration: none; }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 9pt;
      background: #f3f5f8;
      padding: 0 2px;
      border-radius: 2px;
    }
    pre {
      background: #f3f5f8;
      border: 1px solid #d5dde6;
      border-left: 3px solid #1f4e79;
      padding: 3mm 4mm;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      font-size: 8.2pt;
      line-height: 1.35;
      page-break-inside: avoid;
    }
    pre code { background: none; padding: 0; font-size: inherit; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 5mm;
      font-size: 8.6pt;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    th, td {
      border: 1px solid #c5d0dc;
      padding: 1.6mm 2.2mm;
      vertical-align: top;
      text-align: left;
      word-break: break-word;
    }
    th {
      background: #1f4e79;
      color: #fff;
      font-weight: 600;
    }
    tr:nth-child(even) td { background: #f6f8fb; }
    blockquote {
      margin: 0 0 4mm;
      padding: 2mm 4mm;
      border-left: 3px solid #c9a227;
      background: #fff8e8;
    }
    hr {
      border: 0;
      border-top: 1px solid #d5dde6;
      margin: 6mm 0;
    }
    strong { color: #12263a; }
    #toc, h2 + ul { page-break-inside: avoid; }
  </style>
</head>
<body>
  <section class="cover">
    <p class="kicker">${isFeatures ? "Product feature guide" : "Internal engineering brief"}</p>
    <h1>Fayyaz Travels Admin</h1>
    <p class="subtitle">${
      isFeatures
        ? "How every feature works — workflows, who uses them, and what gets saved"
        : "Full technical documentation for the <code>ftadmin</code> codebase"
    }</p>
    <dl>
      <dt>Product</dt><dd>Staff admin panel (not the public website)</dd>
      <dt>Codebase</dt><dd>ftadmin — Next.js UI + Fastify API + MySQL <code>fz</code></dd>
      <dt>Production URL</dt><dd>https://fayyaz.travel/panel/</dd>
      <dt>API service</dt><dd>ftbackend (default port 4000)</dd>
      <dt>Document date</dt><dd>14 August 2026</dd>
      <dt>Audience</dt><dd>${isFeatures ? "Staff, product, and engineers learning how the panel works" : "Engineers joining or maintaining this repository"}</dd>
    </dl>
  </section>
  ${body}
</body>
</html>
`;

const workDir = mkdtempSync(path.join(tmpdir(), "ftadmin-docs-"));
const htmlPath = path.join(workDir, "DOCUMENTATION.html");
writeFileSync(htmlPath, html, "utf8");

const result = spawnSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ],
  { stdio: "inherit" }
);

rmSync(workDir, { recursive: true, force: true });

if (result.status !== 0) {
  console.error("Chrome failed to generate the PDF.");
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${pdfPath}`);
