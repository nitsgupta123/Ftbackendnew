import fs from "node:fs";

const files = [
  "src/components/dashboard/OverviewChart.tsx",
  "src/components/packages/PackageOverviewSection.tsx",
  "src/components/blogs/BlogRichTextEditor.tsx",
];

for (const file of files) {
  let code = fs.readFileSync(file, "utf8");
  const before = code;
  code = code.replace(/\}="([^"]*)"/g, '} fill="$1"');
  code = code.replace(/(className="[^"]*")"([^"]*)"/g, '$1 fill="$2"');
  if (code !== before) {
    fs.writeFileSync(file, code);
    console.log("fixed", file);
  } else {
    console.log("no change", file);
  }
}
