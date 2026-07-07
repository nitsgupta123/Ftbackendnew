import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
import * as t from "@babel/types";

const traverse = traverseModule.default ?? traverseModule;
const generate = generateModule.default ?? generateModule;

const rootDir = path.resolve("src");
const skipDir = path.join(rootDir, "components", "ui");

const tagToComponent = {
  button: { name: "Button", source: "@/components/ui/button" },
  input: { name: "Input", source: "@/components/ui/input" },
  textarea: { name: "Textarea", source: "@/components/ui/textarea" },
  select: { name: "NativeSelect", source: "@/components/ui/native-select" },
  label: { name: "Label", source: "@/components/ui/label" },
  table: { name: "Table", source: "@/components/ui/table" },
  thead: { name: "TableHeader", source: "@/components/ui/table" },
  tbody: { name: "TableBody", source: "@/components/ui/table" },
  tr: { name: "TableRow", source: "@/components/ui/table" },
  th: { name: "TableHead", source: "@/components/ui/table" },
  td: { name: "TableCell", source: "@/components/ui/table" },
};

function getAllTsxFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fullPath === skipDir) continue;
      files.push(...getAllTsxFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function ensureImports(ast, neededImports) {
  if (!neededImports.size) return;

  const bySource = new Map();
  for (const componentName of neededImports) {
    const source = Object.values(tagToComponent).find(
      (entry) => entry.name === componentName,
    )?.source;
    if (!source) continue;
    if (!bySource.has(source)) bySource.set(source, new Set());
    bySource.get(source).add(componentName);
  }

  const body = ast.program.body;

  for (const [source, names] of bySource.entries()) {
    let importDecl = body.find(
      (node) => t.isImportDeclaration(node) && node.source.value === source,
    );

    if (!importDecl) {
      importDecl = t.importDeclaration([], t.stringLiteral(source));
      const lastImportIndex = body.reduce(
        (idx, node, currentIdx) =>
          t.isImportDeclaration(node) ? currentIdx : idx,
        -1,
      );
      body.splice(lastImportIndex + 1, 0, importDecl);
    }

    const existing = new Set(
      importDecl.specifiers
        .filter((spec) => t.isImportSpecifier(spec))
        .map((spec) => spec.imported.name),
    );

    for (const name of names) {
      if (existing.has(name)) continue;
      importDecl.specifiers.push(
        t.importSpecifier(t.identifier(name), t.identifier(name)),
      );
    }
  }
}

function migrateFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  if (!original.includes("<")) return false;

  const ast = parse(original, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  const neededImports = new Set();
  let changed = false;

  traverse(ast, {
    JSXOpeningElement(pathRef) {
      if (!t.isJSXIdentifier(pathRef.node.name)) return;
      const mapped = tagToComponent[pathRef.node.name.name];
      if (!mapped) return;
      pathRef.node.name = t.jsxIdentifier(mapped.name);
      neededImports.add(mapped.name);
      changed = true;
    },
    JSXClosingElement(pathRef) {
      if (!t.isJSXIdentifier(pathRef.node.name)) return;
      const mapped = tagToComponent[pathRef.node.name.name];
      if (!mapped) return;
      pathRef.node.name = t.jsxIdentifier(mapped.name);
      neededImports.add(mapped.name);
      changed = true;
    },
  });

  if (!changed) return false;

  ensureImports(ast, neededImports);

  const output = generate(ast, {
    jsescOption: { minimal: true },
  }).code;

  if (output !== original) {
    fs.writeFileSync(filePath, `${output}\n`);
    return true;
  }
  return false;
}

const files = getAllTsxFiles(rootDir);
let changedCount = 0;
for (const file of files) {
  if (migrateFile(file)) changedCount += 1;
}

console.log(`Migrated ${changedCount} TSX files to shadcn primitives.`);
