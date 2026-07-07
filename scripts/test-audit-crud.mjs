/**
 * Verifies package audit metadata through the API (create, read, update, delete).
 * Requires the Fastify API on API_PORT (default 4000) and a migrated database.
 *
 * Run: node scripts/test-audit-crud.mjs
 */

const API_BASE = process.env.API_URL ?? "http://localhost:4000";
const AUDIT_USER = process.env.TEST_AUDIT_USER ?? "Test Admin";

function auditHeaders(extra = {}) {
  return {
    "x-audit-user": AUDIT_USER,
    ...extra,
  };
}

function jsonAuditHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    ...auditHeaders(extra),
  };
}

async function request(method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: jsonAuditHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `${method} ${path} failed (${response.status})`);
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Testing audit CRUD against ${API_BASE} as "${AUDIT_USER}"...`);

  const health = await fetch(`${API_BASE}/health`);
  assert(health.ok, "API health check failed — start the server with npm run dev:api");

  const created = await request("POST", "/api/packages", {
    supplier_source: { supplierName: "Audit Test Supplier" },
    current_step: 1,
  });

  const pkg = created.package;
  assert(pkg?.id, "Create did not return a package id");
  assert(pkg.created_by === AUDIT_USER, `created_by expected "${AUDIT_USER}", got "${pkg.created_by}"`);
  assert(pkg.updated_by === AUDIT_USER, `updated_by expected "${AUDIT_USER}", got "${pkg.updated_by}"`);
  assert(pkg.created_at, "created_at missing on create");
  assert(pkg.updated_at, "updated_at missing on create");
  console.log("✓ Create stores created_by, updated_by, created_at, updated_at");

  const fetched = await request("GET", `/api/packages/${pkg.id}`);
  assert(fetched.package.created_by === AUDIT_USER, "created_by not returned on GET");
  assert(fetched.package.updated_at, "updated_at not returned on GET");
  console.log("✓ Read returns audit metadata");

  const updateUser = `${AUDIT_USER} (editor)`;
  const updated = await fetch(`${API_BASE}/api/packages/${pkg.id}`, {
    method: "PATCH",
    headers: jsonAuditHeaders({ "x-audit-user": updateUser }),
    body: JSON.stringify({ current_step: 2 }),
  }).then((r) => r.json());

  assert(updated.package.updated_by === updateUser, `updated_by expected "${updateUser}"`);
  assert(
    new Date(updated.package.updated_at).getTime() >= new Date(pkg.updated_at).getTime(),
    "updated_at did not advance on PATCH"
  );
  assert(updated.package.created_by === AUDIT_USER, "created_by changed after update");
  console.log("✓ Update sets updated_by and refreshes updated_at");

  const deleted = await fetch(`${API_BASE}/api/packages/${pkg.id}`, {
    method: "DELETE",
    headers: auditHeaders({ "x-audit-user": updateUser }),
  }).then((r) => r.json());

  assert(deleted.success === true, "Delete did not succeed");
  console.log("✓ Delete succeeds with audit header");

  console.log("\nAll audit CRUD checks passed.");
}

main().catch((error) => {
  console.error("\nAudit CRUD test failed:", error.message);
  process.exit(1);
});
