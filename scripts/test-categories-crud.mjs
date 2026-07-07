/**
 * Verifies package categories API (list, create, read, update, delete, validation).
 * Requires Fastify API on API_PORT (default 4000), migrated DB, and a super_admin account.
 *
 * Run: npm run test:categories
 * Optional env: ADMIN_EMAIL, ADMIN_PASSWORD, API_URL, TEST_AUDIT_USER
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config();

const API_BASE = process.env.API_URL ?? "http://localhost:4000";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@ftadmin.local").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "FtAdmin@12345";

let authToken = "";
let auditUserName = "";

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${authToken}`,
    ...extra,
  };
}

function jsonHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    ...authHeaders(extra),
  };
}

async function request(method, path, body, { expectStatus } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? jsonHeaders() : authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (expectStatus !== undefined) {
    if (response.status !== expectStatus) {
      throw new Error(
        `${method} ${path} expected ${expectStatus}, got ${response.status}: ${data.error ?? "unknown"}`
      );
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed (${response.status}): ${data.error ?? JSON.stringify(data)}`
    );
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login() {
  const data = await request("POST", "/api/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  assert(data.token, "Login did not return a token");
  authToken = data.token;
  auditUserName = data.user?.fullName ?? data.user?.name ?? "Admin";
  console.log(`✓ Logged in as ${data.user?.email ?? ADMIN_EMAIL} (${data.user?.role ?? "unknown"})`);
}

async function main() {
  console.log(`Testing categories CRUD against ${API_BASE}...\n`);

  const health = await fetch(`${API_BASE}/health`);
  assert(health.ok, "API health check failed — start the server with npm run dev:api");

  await login();

  const list = await request("GET", "/api/categories?limit=5&sort=display_order&order=asc");
  assert(Array.isArray(list.categories), "List did not return categories array");
  assert(typeof list.total === "number", "List did not return total count");
  console.log(`✓ List categories (${list.categories.length} on page, ${list.total} total)`);

  const uniqueSuffix = Date.now();
  const createName = `Test Category ${uniqueSuffix}`;
  const created = await request("POST", "/api/categories", {
    name: createName,
    description: "Automated test category",
    display_order: 999,
    status: "active",
    is_featured: false,
  });

  const category = created.category;
  assert(category?.id, "Create did not return category id");
  assert(category.slug === `test-category-${uniqueSuffix}`, `Unexpected slug: ${category.slug}`);
  assert(category.created_by === auditUserName, `created_by expected "${auditUserName}", got "${category.created_by}"`);
  assert(category.updated_by === auditUserName, `updated_by expected "${auditUserName}"`);
  console.log(`✓ Create category with auto-slug: ${category.slug}`);

  await request(
    "POST",
    "/api/categories",
    { name: createName },
    { expectStatus: 409 }
  );
  console.log("✓ Duplicate name rejected (409)");

  const fetched = await request("GET", `/api/categories/${category.id}`);
  assert(fetched.category.name === createName, "GET returned wrong name");
  assert(fetched.category.slug === category.slug, "GET returned wrong slug");
  console.log("✓ Read category by id");

  const updateUser = `${auditUserName} (editor)`;
  const updated = await fetch(`${API_BASE}/api/categories/${category.id}`, {
    method: "PUT",
    headers: jsonHeaders({ "x-audit-user": updateUser }),
    body: JSON.stringify({
      description: "Updated by test script",
      status: "inactive",
    }),
  }).then((r) => r.json());

  assert(updated.category.status === "inactive", "Update did not set inactive status");
  assert(updated.category.updated_by === auditUserName, `updated_by expected JWT user "${auditUserName}"`);
  assert(updated.category.created_by === auditUserName, "created_by changed after update");
  console.log("✓ Update category and audit trail");

  const inactiveList = await request("GET", "/api/categories?status=inactive&search=Test%20Category");
  assert(
    inactiveList.categories.some((c) => c.id === category.id),
    "Inactive filter did not include updated category"
  );
  console.log("✓ Filter by status and search");

  const deleted = await request("DELETE", `/api/categories/${category.id}`);
  assert(deleted.ok === true, "Delete did not return ok: true");
  console.log("✓ Delete category (super_admin)");

  await request("GET", `/api/categories/${category.id}`, undefined, { expectStatus: 404 });
  console.log("✓ Deleted category returns 404 on GET");

  console.log("\nAll category API checks passed.");
}

main().catch((error) => {
  console.error("\nCategories CRUD test failed:", error.message);
  process.exit(1);
});
