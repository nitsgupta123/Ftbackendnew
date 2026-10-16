/**
 * End-to-end CRUD check: every admin API module is exercised over HTTP and each write is
 * verified directly in MySQL. Everything created is removed afterwards (including the
 * temporary super admin used to sign in) and touched settings are restored.
 *
 *   npm run dev:api   (in another terminal)
 *   node scripts/e2e-crud.mjs
 */
import { randomBytes } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const BASE = process.env.E2E_API_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? 4000}`;
const TAG = `e2e${Date.now().toString(36)}`;

const db = await mysql.createConnection({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "fz",
  dateStrings: true,
});

const results = [];
const cleanups = [];
let cookie = "";

function record(area, name, ok, detail = "") {
  results.push({ area, name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function sql(statement, params = []) {
  const [rows] = await db.query(statement, params);
  return rows;
}

async function api(method, url, body, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (cookie) headers.cookie = cookie;
  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(`${BASE}${url}`, { method, headers, body: payload });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, json, headers: response.headers };
}

function pickRecord(json) {
  if (!json || typeof json !== "object") return null;
  return Object.values(json).find((v) => v && typeof v === "object" && !Array.isArray(v) && "id" in v) ?? null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, stable(value[k])])
    );
  }
  return value;
}

function same(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

/** Report every input field that did not come back unchanged. */
function compareFields(area, label, input, output, ignore = []) {
  const mismatched = [];
  for (const [key, value] of Object.entries(input)) {
    if (ignore.includes(key)) continue;
    if (!same(value, output?.[key])) {
      mismatched.push(`${key}: sent ${JSON.stringify(value)?.slice(0, 80)} got ${JSON.stringify(output?.[key])?.slice(0, 80)}`);
    }
  }
  record(area, `${label} round-trips every field`, mismatched.length === 0, mismatched.join("; "));
}

function expectStatus(area, name, res, expected) {
  const list = Array.isArray(expected) ? expected : [expected];
  const ok = list.includes(res.status);
  record(area, name, ok, ok ? "" : `HTTP ${res.status} ${JSON.stringify(res.json)?.slice(0, 200)}`);
  return ok;
}

async function settingsBlob(type, logicalId) {
  const rows = await sql(
    "SELECT id, setting_name, setting_content FROM tbl_settings WHERE setting_type = ?",
    [type]
  );
  for (const row of rows) {
    try {
      const data = JSON.parse(row.setting_content);
      if (Number(data?.id ?? row.id) === Number(logicalId)) return { rowId: row.id, data };
    } catch {
      // ignore
    }
  }
  return null;
}

async function namedSetting(type, name) {
  const rows = await sql(
    "SELECT id, setting_content FROM tbl_settings WHERE setting_type = ? AND setting_name = ? ORDER BY id DESC LIMIT 1",
    [type, name]
  );
  return rows[0] ?? null;
}

async function snapshotNamedSetting(type, name) {
  const existing = await namedSetting(type, name);
  cleanups.push(async () => {
    if (existing) {
      await sql("UPDATE tbl_settings SET setting_content = ? WHERE id = ?", [existing.setting_content, existing.id]);
    } else {
      await sql("DELETE FROM tbl_settings WHERE setting_type = ? AND setting_name = ?", [type, name]);
    }
  });
}

// ---------------------------------------------------------------- setup

async function createTestAdmin() {
  const email = `${TAG}@example.test`;
  const password = `${randomBytes(18).toString("base64url")}A1`;
  const hash = await bcrypt.hash(password, 12);
  const result = await sql(
    `INSERT INTO tbl_user (
       user_name, password, user_email, first_name, last_name,
       country_code, phone, birthday, place_birth, gender, country, user_img,
       insert_date, edit_date, user_type, status, email_verified, user_id
     ) VALUES (?, ?, ?, 'E2E', 'Runner', '', '', '', '', '', '', '', NOW(), NOW(), '1', 1, 1, 0)`,
    [email, hash, email]
  );
  const id = result.insertId;
  cleanups.push(async () => {
    await sql("DELETE FROM tbl_user WHERE id = ?", [id]);
  });
  return { id, email, password };
}

// ---------------------------------------------------------------- tests

async function testAuth(admin) {
  const area = "auth";
  const unauth = await api("GET", "/api/auth/me");
  expectStatus(area, "GET /me without session is rejected", unauth, 401);

  const login = await api("POST", "/api/auth/login", { email: admin.email, password: admin.password });
  if (!expectStatus(area, "POST /login", login, 200)) throw new Error("Login failed; cannot continue");
  const setCookie = login.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/ft_admin_session=([^;]+)/);
  record(area, "session cookie is HttpOnly", /HttpOnly/i.test(setCookie));
  cookie = match ? `ft_admin_session=${match[1]}` : "";

  const me = await api("GET", "/api/auth/me");
  expectStatus(area, "GET /me with session", me, 200);
  record(area, "/me returns the signed-in user", me.json?.user?.email === admin.email);
}

async function testDashboard() {
  expectStatus("dashboard", "GET /api/dashboard", await api("GET", "/api/dashboard"), 200);
}

async function testSettings() {
  const area = "settings";
  const before = await api("GET", "/api/settings");
  if (!expectStatus(area, "GET /api/settings", before, 200)) return;
  const original = before.json.settings ?? before.json;

  await snapshotNamedSetting("admin_panel", "quote_cc_emails");
  const globals = await sql(
    "SELECT id, setting_name, setting_value FROM tbl_settings WHERE setting_type = 'global' AND setting_name IN ('site_title','site_disc','site_email','site_phone')"
  );
  cleanups.push(async () => {
    for (const g of globals) await sql("UPDATE tbl_settings SET setting_value = ? WHERE id = ?", [g.setting_value, g.id]);
    await sql("DELETE FROM tbl_settings WHERE setting_type = 'admin_panel' AND setting_name IN ('homepage_title','homepage_description','support_email','support_phone')");
  });
  const globalOf = (name) => globals.find((g) => g.setting_name === name)?.setting_value;
  record(area, "form shows the website's own title/phone/email (global rows)",
    original.homepage_title === globalOf("site_title") && original.support_phone === globalOf("site_phone") && original.support_email === globalOf("site_email"),
    JSON.stringify([original.homepage_title, original.support_phone, original.support_email]));

  const description = `E2E ${TAG} `.repeat(30).trim().slice(0, 250);
  const payload = {
    site_name: original.site_name,
    company_name: original.company_name,
    support_email: `${TAG}@example.test`,
    support_phone: "+65 1111 2222",
    office_address: original.office_address ?? "",
    homepage_title: `Title ${TAG}`,
    homepage_description: description,
    maintenance_mode: Boolean(original.maintenance_mode),
    quote_cc_emails: `${TAG}@example.test`,
    quote_bcc_emails: original.quote_bcc_emails ?? "",
  };
  const put = await api("PUT", "/api/settings", payload);
  if (!expectStatus(area, "PUT /api/settings", put, 200)) return;

  const rows = await sql(
    "SELECT setting_name, setting_value FROM tbl_settings WHERE setting_type = 'global' AND setting_name IN ('site_title','site_disc','site_email','site_phone')"
  );
  const value = (name) => rows.find((r) => r.setting_name === name)?.setting_value;
  record(area, "title/description/email/phone saved to the website's global rows",
    value("site_title") === payload.homepage_title && value("site_disc") === description &&
      value("site_email") === payload.support_email && value("site_phone") === payload.support_phone,
    JSON.stringify(rows).slice(0, 160));
  const dupes = await sql("SELECT COUNT(*) n FROM tbl_settings WHERE setting_type = 'admin_panel' AND setting_name IN ('homepage_title','homepage_description','support_email','support_phone')");
  record(area, "no shadow copies left in admin_panel rows", Number(dupes[0].n) === 0);
  const cc = await namedSetting("admin_panel", "quote_cc_emails");
  record(area, "panel-only setting (quote CC) saved in admin_panel row", cc?.setting_content === payload.quote_cc_emails);
  const after = await api("GET", "/api/settings");
  const s = after.json.settings ?? after.json;
  compareFields(area, "settings", payload, s);
  expectStatus(area, "rejects description over 255 chars", await api("PUT", "/api/settings", { ...payload, homepage_description: "x".repeat(300) }), 400);
}

function pickKeys(obj, keys) {
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined && obj[k] !== null).map((k) => [k, obj[k]]));
}

async function crudModule({
  area,
  base,
  create,
  update,
  table,
  titleColumn,
  titleField,
  ignore = [],
  afterDelete = "gone",
  extraRead,
}) {
  const created = await api("POST", base, create);
  if (!expectStatus(area, `POST ${base}`, created, [200, 201])) return null;
  const rec = pickRecord(created.json);
  const id = rec?.id;
  record(area, "create returns an id", Number.isInteger(id), `id=${id}`);
  if (!id) return null;

  if (table) {
    const rows = await sql(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    record(area, `row exists in ${table}`, rows.length === 1);
    if (rows.length && titleColumn) {
      record(area, `${table}.${titleColumn} matches`, rows[0][titleColumn] === create[titleField]);
    }
  }

  const read = await api("GET", `${base}/${id}`);
  if (expectStatus(area, `GET ${base}/:id`, read, 200)) {
    compareFields(area, "create", create, pickRecord(read.json), ignore);
  }
  if (extraRead) await extraRead(id, pickRecord(read.json));

  const updated = await api(update.method ?? "PUT", `${base}/${id}`, update.body);
  if (expectStatus(area, `${update.method ?? "PUT"} ${base}/:id`, updated, 200)) {
    const reread = await api("GET", `${base}/${id}`);
    compareFields(area, "update", update.body, pickRecord(reread.json), ignore);
    if (table && titleColumn && update.body[titleField]) {
      const rows = await sql(`SELECT ${titleColumn} FROM ${table} WHERE id = ?`, [id]);
      record(area, `${table}.${titleColumn} updated in MySQL`, rows[0]?.[titleColumn] === update.body[titleField]);
    }
  }

  const list = await api("GET", base);
  expectStatus(area, `GET ${base} (list)`, list, 200);

  const del = await api("DELETE", `${base}/${id}`);
  expectStatus(area, `DELETE ${base}/:id`, del, 200);
  if (table) {
    const rows = await sql(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (afterDelete === "gone") {
      record(area, `row removed from ${table}`, rows.length === 0);
    } else {
      record(area, `row soft-deleted in ${table}`, rows.length === 1 && afterDelete(rows[0]), JSON.stringify(rows[0]?.status));
    }
  }
  const gone = await api("GET", `${base}/${id}`);
  record(area, "GET after delete is 404", gone.status === 404, `HTTP ${gone.status}`);
  return id;
}

async function testPackageCategories() {
  const ids = [];
  cleanups.push(async () => {
    if (ids.length) await sql(`DELETE FROM tbl_categories WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  });
  const id = await crudModule({
    area: "package-categories",
    base: "/api/categories",
    create: { name: `Cat ${TAG}`, slug: `cat-${TAG}`, display_order: 3, status: "active", is_featured: true },
    update: { body: { name: `Cat ${TAG} v2`, description: "Updated description" } },
    table: "tbl_categories",
    titleColumn: "cat_title",
    titleField: "name",
    extraRead: async (catId) => {
      const [row] = await sql("SELECT cat_type FROM tbl_categories WHERE id = ?", [catId]);
      record("package-categories", "stored with cat_type 'packages'", row?.cat_type === "packages", row?.cat_type);
    },
  });
  if (id) ids.push(id);

  const area = "package-categories";
  const list = await api("GET", "/api/categories?limit=100");
  record(area, "shop product categories (Luggages, Mugs…) are not listed", !(list.json?.categories ?? []).some((c) => /^(Luggages|Mugs|Hoodies)$/.test(c.name)));
  const [articleCat] = await sql("SELECT id FROM tbl_categories WHERE cat_type = 'article' LIMIT 1");
  if (articleCat) {
    expectStatus(area, "blog category not reachable via /api/categories/:id", await api("GET", `/api/categories/${articleCat.id}`), 404);
  }
  const [shopCat] = await sql("SELECT id FROM tbl_categories WHERE cat_type = 'products' LIMIT 1");
  if (shopCat) {
    expectStatus(area, "shop category cannot be deleted from the panel", await api("DELETE", `/api/categories/${shopCat.id}`), 404);
    const still = await sql("SELECT id FROM tbl_categories WHERE id = ?", [shopCat.id]);
    record(area, "shop category still in tbl_categories", still.length === 1);
  }
}

async function testBlogCategories() {
  const ids = [];
  cleanups.push(async () => {
    if (ids.length) await sql(`DELETE FROM tbl_categories WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  });
  const id = await crudModule({
    area: "blog-categories",
    base: "/api/blog-categories",
    create: { name: `BlogCat ${TAG}`, slug: `blogcat-${TAG}`, status: "active", display_order: 2 },
    update: { body: { name: `BlogCat ${TAG} v2`, description: "Desc" } },
    table: "tbl_categories",
    titleColumn: "cat_title",
    titleField: "name",
    extraRead: async (catId) => {
      const [row] = await sql("SELECT cat_type FROM tbl_categories WHERE id = ?", [catId]);
      record("blog-categories", "stored with cat_type 'article'", row?.cat_type === "article", row?.cat_type);
      expectStatus("blog-categories", "not reachable via package /api/categories/:id", await api("GET", `/api/categories/${catId}`), 404);
    },
  });
  if (id) ids.push(id);
}

async function testBlogs() {
  const ids = [];
  const blogIds = [];
  cleanups.push(async () => {
    if (blogIds.length) await sql(`DELETE FROM tbl_post_details WHERE blog_id IN (${blogIds.map(() => "?").join(",")})`, blogIds);
    if (!ids.length) return;
    await sql(`DELETE FROM tbl_post_details WHERE post_id IN (${ids.map(() => "?").join(",")})`, ids);
    await sql(`DELETE FROM tbl_post WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  });
  const area = "blogs";
  const id = await crudModule({
    extraRead: async (postId) => {
      ids.push(postId);
      const [row] = await sql("SELECT post_type, blog_id, sale_page, is_draft, post_url, breadcrumb, content_display FROM tbl_post WHERE id = ?", [postId]);
      blogIds.push(row?.blog_id);
      record(area, "tbl_post columns: article type, featured→sale_page, draft→is_draft, legacy flags",
        row?.post_type === "article" && Number(row?.sale_page) === 1 && Number(row?.is_draft) === 1 &&
          row?.post_url === `blog-${TAG}` && Number(row?.breadcrumb) === 0 && Number(row?.content_display) === 0,
        JSON.stringify(row));
      record(area, "new post gets a blog_id (UUID) like legacy posts", /^[0-9a-f-]{36}$/.test(row?.blog_id ?? ""), row?.blog_id);
      const details = await sql("SELECT post_id, blog_id, meta_title, meta_discription FROM tbl_post_details WHERE post_id = ? OR blog_id = ?", [postId, row?.blog_id]);
      record(area, "SEO saved to tbl_post_details linked by post_id and blog_id",
        details.length === 1 && details[0].meta_title === "SEO title" && details[0].blog_id === row?.blog_id,
        JSON.stringify(details));

      // Newer legacy CMS rows link details by blog_id only (post_id = 0).
      await sql("UPDATE tbl_post_details SET post_id = 0 WHERE blog_id = ?", [row?.blog_id]);
      const legacyRead = pickRecord((await api("GET", `/api/blogs/${postId}`)).json);
      record(area, "reads SEO from a blog_id-linked details row", legacyRead?.seo_meta_title === "SEO title", legacyRead?.seo_meta_title);
      await api("PUT", `/api/blogs/${postId}`, { seo_meta_title: "SEO title 2" });
      const after = await sql("SELECT meta_title FROM tbl_post_details WHERE post_id = ? OR blog_id = ?", [postId, row?.blog_id]);
      record(area, "SEO edit updates that same row (no duplicate)", after.length === 1 && after[0].meta_title === "SEO title 2", JSON.stringify(after));
      await api("PUT", `/api/blogs/${postId}`, { seo_meta_title: "SEO title" });

      await api("PUT", `/api/blogs/${postId}`, { status: "pending_review" });
      const [review] = await sql("SELECT is_draft, post_status FROM tbl_post WHERE id = ?", [postId]);
      const reviewRead = pickRecord((await api("GET", `/api/blogs/${postId}`)).json);
      const reviewList = (await api("GET", "/api/blogs?status=pending_review&limit=100")).json;
      const reviewItems = reviewList?.posts ?? reviewList?.items ?? reviewList?.data ?? [];
      record(area, "pending_review stored distinctly (is_draft=1, post_status=11) and read back",
        Number(review?.is_draft) === 1 && Number(review?.post_status) === 11 && reviewRead?.status === "pending_review" &&
          reviewItems.some((post) => post.id === postId),
        JSON.stringify({ review, status: reviewRead?.status, listed: reviewItems.length }));
      await api("PUT", `/api/blogs/${postId}`, { status: "draft" });
      const [draft] = await sql("SELECT is_draft, post_status FROM tbl_post WHERE id = ?", [postId]);
      record(area, "back to draft restores post_status=10", Number(draft?.is_draft) === 1 && Number(draft?.post_status) === 10, JSON.stringify(draft));

      const [owner] = await sql("SELECT user_id FROM tbl_post WHERE id = ?", [postId]);
      record(area, "creator saved to tbl_post.user_id and shown as created_by",
        Number(owner?.user_id) > 0 && Boolean(reviewRead?.created_by) && Boolean(reviewRead?.updated_by),
        JSON.stringify({ user_id: owner?.user_id, created_by: reviewRead?.created_by, updated_by: reviewRead?.updated_by }));

      await sql("UPDATE tbl_post SET is_auto_scheduled_posted = 1 WHERE id = ?", [postId]);
      await api("PUT", `/api/blogs/${postId}`, { status: "scheduled", published_at: "2099-01-02 15:30:00" });
      const [sched] = await sql("SELECT is_auto_scheduled, auto_schedule_date, is_auto_scheduled_posted FROM tbl_post WHERE id = ?", [postId]);
      const schedRead = pickRecord((await api("GET", `/api/blogs/${postId}`)).json);
      record(area, "scheduled: date column + full time kept, posted flag reset",
        Number(sched?.is_auto_scheduled) === 1 && Number(sched?.is_auto_scheduled_posted) === 0 &&
          String(sched?.auto_schedule_date ?? "").startsWith("2099-01-02") &&
          schedRead?.status === "scheduled" && String(schedRead?.published_at ?? "").startsWith("2099-01-02T15:30:00"),
        JSON.stringify({ sched, published_at: schedRead?.published_at }));
      await api("PUT", `/api/blogs/${postId}`, { status: "draft" });

      await sql("UPDATE tbl_post SET post_url = ? WHERE id = ?", [`Legacy ${TAG}?`, postId]);
      const legacySlugSave = await api("PUT", `/api/blogs/${postId}`, { title: `Blog ${TAG}`, slug: `Legacy ${TAG}?` });
      const [slugRow] = await sql("SELECT post_url FROM tbl_post WHERE id = ?", [postId]);
      record(area, "unchanged legacy slug is accepted and kept verbatim",
        legacySlugSave.status === 200 && slugRow?.post_url === `Legacy ${TAG}?`,
        JSON.stringify({ status: legacySlugSave.status, post_url: slugRow?.post_url }));
      await sql("UPDATE tbl_post SET post_url = ? WHERE id = ?", [`blog-${TAG}`, postId]);
    },
    area: "blogs",
    base: "/api/blogs",
    create: {
      title: `Blog ${TAG}`,
      slug: `blog-${TAG}`,
      excerpt: "Short excerpt",
      content: "<p>Body</p>",
      author_name: "E2E Author",
      status: "draft",
      is_featured: true,
      tags: ["e2e", "test"],
      seo_meta_title: "SEO title",
      seo_meta_description: "SEO description",
    },
    update: { body: { title: `Blog ${TAG} v2`, excerpt: "Updated excerpt", tags: ["changed"] } },
    table: "tbl_post",
    titleColumn: "post_title",
    titleField: "title",
  });
  if (id) ids.push(id);
}

async function testPages() {
  const ids = [];
  cleanups.push(async () => {
    if (!ids.length) return;
    await sql(`DELETE FROM tbl_post_details WHERE post_id IN (${ids.map(() => "?").join(",")})`, ids);
    await sql(`DELETE FROM tbl_post WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  });
  const id = await crudModule({
    area: "pages",
    base: "/api/pages",
    create: {
      title: `Page ${TAG}`,
      slug: `page-${TAG}`,
      excerpt: "Page excerpt",
      content: "<p>Page body</p>",
      status: "draft",
      show_in_nav: true,
      display_order: 4,
      seo_meta_title: "Page SEO",
      seo_meta_description: "Page SEO description",
    },
    update: { body: { title: `Page ${TAG} v2`, show_in_nav: false } },
    table: "tbl_post",
    titleColumn: "post_title",
    titleField: "title",
    extraRead: async (pageId) => {
      ids.push(pageId);
      const [row] = await sql("SELECT post_type, breadcrumb, blog_id FROM tbl_post WHERE id = ?", [pageId]);
      record("pages", "stored as post_type 'pages'; breadcrumb column not hijacked for nav", row?.post_type === "pages" && row?.breadcrumb === null, JSON.stringify(row));

      const types = (await api("GET", "/api/pages/types")).json?.types ?? [];
      record("pages", "page types come from tbl_settings 'template' rows",
        types.some((t) => t.value === "sales-template") && types.some((t) => t.value === "contact-us"), `${types.length} types`);

      await sql("UPDATE tbl_post SET post_date = '2000-01-01' WHERE id = ?", [pageId]);
      await api("PUT", `/api/pages/${pageId}`, { status: "published", page_type: "sales-template" });
      const [pub] = await sql("SELECT post_date, post_template, is_draft, post_status FROM tbl_post WHERE id = ?", [pageId]);
      const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
      record("pages", "publishing sets post_date to today and saves post_template",
        String(pub?.post_date ?? "").startsWith(today) && pub?.post_template === "sales-template" &&
          Number(pub?.is_draft) === 0 && Number(pub?.post_status) === 1,
        JSON.stringify(pub));
      await api("PUT", `/api/pages/${pageId}`, { status: "draft" });
    },
  });
  if (id) ids.push(id);
}

async function testPricingRules() {
  const area = "pricing-rules";
  const created = [];
  cleanups.push(async () => {
    for (const id of created) {
      const blob = await settingsBlob("pricing_rule", id);
      if (blob) await sql("DELETE FROM tbl_settings WHERE id = ?", [blob.rowId]);
    }
  });
  const id = await crudModule({
    area,
    base: "/api/pricing-rules",
    create: {
      name: `Rule ${TAG}`,
      description: "E2E rule",
      scope_type: "destination",
      scope_value: "Japan",
      supplier_currency: "JPY",
      display_currency: "SGD",
      exchange_rate_type: "manual",
      default_exchange_rate: 0.0091,
      markup_type: "percentage",
      default_markup_value: "12",
      minimum_margin_percent: 8,
      status: "inactive",
      display_order: 7,
    },
    update: { body: { name: `Rule ${TAG} v2`, default_markup_value: "15" } },
    extraRead: async (ruleId) => {
      created.push(ruleId);
      const blob = await settingsBlob("pricing_rule", ruleId);
      record(area, "JSON row exists in tbl_settings (pricing_rule)", blob?.data?.name === `Rule ${TAG}`);
    },
  });
  if (id) {
    const blob = await settingsBlob("pricing_rule", id);
    record(area, "tbl_settings row removed after delete", !blob);
  }
  await api("GET", "/api/pricing-rules/stats").then((r) => expectStatus(area, "GET /stats", r, 200));
  await api("GET", "/api/pricing-rules/default").then((r) => expectStatus(area, "GET /default", r, 200));
}

async function testPackageTemplates() {
  const area = "package-templates";
  const created = [];
  cleanups.push(async () => {
    for (const id of created) {
      const blob = await settingsBlob("package_template", id);
      if (blob) await sql("DELETE FROM tbl_settings WHERE id = ?", [blob.rowId]);
    }
  });
  const id = await crudModule({
    area,
    base: "/api/package-templates",
    create: {
      name: `Template ${TAG}`,
      slug: `template-${TAG}`,
      description: "E2E template",
      template_type: "partial",
      included_steps: [1, 2, 5],
      status: "inactive",
      display_order: 9,
    },
    update: { body: { name: `Template ${TAG} v2`, included_steps: [1, 3] } },
    extraRead: async (templateId) => {
      created.push(templateId);
      const blob = await settingsBlob("package_template", templateId);
      record(area, "JSON row exists in tbl_settings (package_template)", blob?.data?.name === `Template ${TAG}`);
    },
  });
  if (id) record(area, "tbl_settings row removed after delete", !(await settingsBlob("package_template", id)));
  await api("GET", "/api/package-templates/stats").then((r) => expectStatus(area, "GET /stats", r, 200));

  const active = await api("POST", "/api/package-templates", {
    name: `Active ${TAG}`,
    slug: `active-${TAG}`,
    template_type: "full",
    included_steps: [1, 2],
    status: "active",
  });
  const activeId = pickRecord(active.json)?.id;
  if (activeId) {
    created.push(activeId);
    const applied = await api("POST", `/api/package-templates/${activeId}/apply`);
    expectStatus(area, "POST /:id/apply", applied, 200);
    const blob = await settingsBlob("package_template", activeId);
    record(area, "usage_count incremented in MySQL", Number(blob?.data?.usage_count) === 1, String(blob?.data?.usage_count));
  }
}

async function testSuppliers() {
  const area = "suppliers";
  const ids = [];
  const partnersBefore = await sql("SELECT COUNT(*) n FROM tbl_partners");
  cleanups.push(async () => {
    if (ids.length) await sql(`DELETE FROM suppliers WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  });
  const id = await crudModule({
    area,
    base: "/api/suppliers",
    create: {
      company_name: `Supplier ${TAG}`,
      country: "Japan",
      city_tour_area: "Osaka",
      status: "active",
      relationship_status: "good",
      services_offered: "Hotels, Transfers",
      contact_person: "Aiko",
      email_address: `${TAG}@supplier.example.test`,
      contact_number: "+81 6 0000 0000",
      website: "https://supplier.example.test",
      notes: "E2E notes",
      relationship_owner: "Ops",
    },
    update: { body: { company_name: `Supplier ${TAG} v2`, notes: "Updated notes", website: "" } },
    table: "suppliers",
    titleColumn: "company_name",
    titleField: "company_name",
    ignore: ["website"],
    extraRead: async (supplierId) => {
      ids.push(supplierId);
      const [row] = await sql("SELECT * FROM suppliers WHERE id = ?", [supplierId]);
      record(area, "every field stored in its own suppliers column",
        row?.country === "Japan" && row?.city_tour_area === "Osaka" && row?.relationship_status === "good" &&
          row?.services_offered === "Hotels, Transfers" && row?.contact_person === "Aiko" &&
          row?.contact_number === "+81 6 0000 0000" && row?.website === "https://supplier.example.test" &&
          row?.notes === "E2E notes" && row?.relationship_owner === "Ops" && row?.status === "active",
        JSON.stringify(row).slice(0, 200));
    },
  });
  if (id) ids.push(id);
  const partnersAfter = await sql("SELECT COUNT(*) n FROM tbl_partners");
  record(area, "website partner logos (tbl_partners) untouched", Number(partnersAfter[0].n) === Number(partnersBefore[0].n));
  const list = await api("GET", "/api/suppliers?limit=100");
  record(area, "press logos are not listed as suppliers", !(list.json?.suppliers ?? []).some((s) => /Straits Times|IATA/.test(s.company_name)));

  await snapshotNamedSetting("supplier_catalog", "custom_services");
  const svc = { name: `Yacht ${TAG}`, slug: `yacht-${TAG}` };
  const add = await api("POST", "/api/suppliers/custom-services", svc);
  expectStatus(area, "POST /custom-services", add, 201);
  const row = await namedSetting("supplier_catalog", "custom_services");
  record(area, "custom service stored in MySQL", Boolean(row && row.setting_content.includes(svc.slug)));
  const services = await api("GET", "/api/suppliers/custom-services");
  record(area, "GET /custom-services returns it", Boolean(services.json?.services?.some((s) => s.slug === svc.slug)));
  await api("GET", "/api/suppliers/stats").then((r) => expectStatus(area, "GET /stats", r, 200));
  await api("GET", "/api/suppliers/countries").then((r) => expectStatus(area, "GET /countries", r, 200));
}

async function testPackages() {
  const area = "packages";
  const catResult = await sql(
    `INSERT INTO tbl_categories (cat_title, cat_slug, cat_content, cat_img, cat_parent, meta_title, meta_keyword,
       meta_discription, cat_type, insert_date, edit_date, status, user_id)
     VALUES (?, ?, '', '', 0, '', '', '', 'packages', NOW(), NOW(), 1, 0)`,
    [`PkgCat ${TAG}`, `pkgcat-${TAG}`]
  );
  const catId = catResult.insertId;
  let pkgId = null;
  cleanups.push(async () => {
    await sql("DELETE FROM tbl_categories WHERE id = ?", [catId]);
    if (pkgId) {
      await sql("DELETE FROM tbl_packages WHERE id = ?", [pkgId]);
      await sql("DELETE FROM tbl_settings WHERE setting_type = 'package_wizard' AND setting_name LIKE ?", [`${pkgId}:%`]);
      const blob = await settingsBlob("package_categories_map", pkgId);
      if (blob) await sql("DELETE FROM tbl_settings WHERE id = ?", [blob.rowId]);
    }
  });

  const supplierSource = { supplierName: `Supplier ${TAG}`, supplierCountry: "Japan", notes: "from e2e" };
  const created = await api("POST", "/api/packages", {
    package_title: `Package ${TAG}`,
    slug: `package-${TAG}`,
    supplier_source: supplierSource,
    current_step: 2,
  });
  if (!expectStatus(area, "POST /api/packages", created, [200, 201])) return;
  pkgId = pickRecord(created.json)?.id;
  const rows = await sql("SELECT p_name, p_slug FROM tbl_packages WHERE id = ?", [pkgId]);
  record(area, "row exists in tbl_packages", rows[0]?.p_name === `Package ${TAG}`);

  const [place] = await sql(
    `SELECT d.id AS dest_id, d.d_name, c.id AS city_id, c.city_name
     FROM tbl_destinations d JOIN tbl_citys c ON c.country_code = d.id
     WHERE d.status = 1 AND c.city_name <> '' ORDER BY d.id, c.id LIMIT 1`
  );
  const sections = {
    current_step: 6,
    package_basics: {
      packageTitle: `Package ${TAG}`,
      slug: `package-${TAG}`,
      shortIntro: "Intro",
      packageOverview: "Overview",
      packageMode: "private",
      tourType: "leisure",
      runs: "daily",
      countriesCovered: place?.d_name ?? "Japan",
      citiesOrRegions: `${place?.city_name ?? "Osaka"}, Nowhere${TAG}`,
      days: "5",
      nights: "4",
      categoryIds: [catId],
      isSeasonalPackage: false,
    },
    itinerary: { days: [{ day: 1, title: "Arrive Osaka", description: "Check in" }] },
    hotels: [{ name: "Hotel E2E", city: "Osaka", nights: 2 }],
    booking_policy: { cancellation: "Free until 14 days" },
    consultant_view: { notes: "Consultant only" },
    frontend_faqs: [{ question: "Visa?", answer: "Not needed" }],
    sales_ads_assets: { headline: "Sale" },
    seo: { metaTitle: "Pkg SEO", metaDescription: "Pkg SEO desc", focusKeyword: "japan" },
    review_publish: { checklist: ["ok"] },
    pricing: { displayCurrency: "SGD", basePrice: 1999 },
    media_frontend: { packageCardImage: "/uploads/images/card.jpg", mobileHeroImage: "/uploads/images/m.jpg" },
    inclusions: { included: ["Breakfast", "Transfers"], excluded: ["Flights"] },
  };
  const patched = await api("PATCH", `/api/packages/${pkgId}`, sections);
  expectStatus(area, "PATCH /api/packages/:id (wizard sections)", patched, 200);

  const read = await api("GET", `/api/packages/${pkgId}`);
  if (expectStatus(area, "GET /api/packages/:id", read, 200)) {
    const pkg = pickRecord(read.json);
    compareFields(area, "wizard sections", { supplier_source: supplierSource, ...sections }, pkg);
  }
  const wizardRows = await sql(
    "SELECT COUNT(*) n FROM tbl_settings WHERE setting_type = 'package_wizard' AND setting_name LIKE ?",
    [`${pkgId}:%`]
  );
  record(area, "wizard sections stored in MySQL", Number(wizardRows[0].n) >= Object.keys(sections).length, `${wizardRows[0].n} rows`);
  const catBlob = await settingsBlob("package_categories_map", pkgId);
  record(area, "package category ids stored in MySQL", same(catBlob?.data?.category_ids, [catId]));
  const catRead = pickRecord((await api("GET", `/api/categories/${catId}`)).json);
  record(area, "category shows its real package count", catRead?.total_packages === 1, String(catRead?.total_packages));
  const [shopCat] = await sql("SELECT id FROM tbl_categories WHERE cat_type = 'products' LIMIT 1");
  if (shopCat) {
    await api("PATCH", `/api/packages/${pkgId}`, { package_basics: { ...sections.package_basics, categoryIds: [catId, shopCat.id] } });
    const blob2 = await settingsBlob("package_categories_map", pkgId);
    record(area, "shop product categories cannot be assigned to packages", same(blob2?.data?.category_ids, [catId]), JSON.stringify(blob2?.data?.category_ids));
    await api("PATCH", `/api/packages/${pkgId}`, { package_basics: sections.package_basics });
  }

  const [cols] = await sql(
    `SELECT p_name, country_id, desti_list, day_night, feature_img, desti_image, inclusions, exclusions,
            meta_title, meta_description, meta_keywords, package_currency
     FROM tbl_packages WHERE id = ?`,
    [pkgId]
  );
  record(area, "tbl_packages.day_night uses legacy 'ND | MN' format", cols?.day_night === "5D | 4N", cols?.day_night);
  if (place) {
    record(area, "country name resolved to tbl_destinations id", cols?.country_id === String(place.dest_id), cols?.country_id);
    record(area, "city resolved to city_<id>; unknown names not written as text", cols?.desti_list === `city_${place.city_id}`, cols?.desti_list);
  }
  record(area, "tbl_packages media/inclusions/SEO columns written",
    cols?.feature_img === "/uploads/images/card.jpg" && cols?.desti_image === "/uploads/images/m.jpg" &&
    cols?.inclusions === "Breakfast\nTransfers" && cols?.exclusions === "Flights" &&
    cols?.meta_title === "Pkg SEO" && cols?.meta_keywords === "japan" && cols?.package_currency === "SGD",
    JSON.stringify(cols).slice(0, 200));

  const partial = await api("PATCH", `/api/packages/${pkgId}`, { seo: { ...sections.seo, metaTitle: "Pkg SEO 2" } });
  expectStatus(area, "PATCH with only one section", partial, 200);
  const reread = pickRecord((await api("GET", `/api/packages/${pkgId}`)).json);
  compareFields(area, "partial update keeps other sections", { ...sections, seo: { ...sections.seo, metaTitle: "Pkg SEO 2" } }, reread, ["current_step"]);

  const quote = await api("POST", `/api/packages/${pkgId}/supplier-quotes/send`, {
    to: [`${TAG}@supplier.example.test`],
    subject: `Quote ${TAG}`,
    body: "Please quote this package.",
    quoteData: { notes: "e2e quote", attachPackage: false, includeDayByDayItinerary: false },
  });
  if (quote.status === 503 || (quote.status === 500 && /ethereal|ENOTFOUND|ECONN|getaddrinfo|timed? ?out/i.test(JSON.stringify(quote.json)))) {
    record(area, "supplier quote send (skipped: no mail transport reachable)", true, JSON.stringify(quote.json).slice(0, 120));
  } else if (expectStatus(area, "POST /:id/supplier-quotes/send", quote, 200)) {
    const [qrow] = await sql(
      "SELECT setting_content FROM tbl_settings WHERE setting_type = 'package_wizard' AND setting_name = ?",
      [`${pkgId}:supplier_quote_tool`]
    );
    const stored = qrow ? JSON.parse(qrow.setting_content) : null;
    const data = stored?.data ?? stored;
    record(area, "sent quote (subject, recipients, lastSentAt) stored in MySQL",
      data?.emailSubject === `Quote ${TAG}` && Boolean(data?.lastSentAt) && data?.notes === "e2e quote",
      JSON.stringify(data).slice(0, 160));
  }

  for (const sub of ["stats", "expiring-rates", "supplier-quotes", "recently-published", "combined", "all"]) {
    expectStatus(area, `GET /api/packages/${sub}`, await api("GET", `/api/packages/${sub}`), 200);
  }

  const statsBefore = (await api("GET", "/api/packages/stats")).json?.stats ?? {};
  const validityTo = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const firstCategory = reread?.pricing?.hotelCategories?.[0] ?? {};
  const firstRange = firstCategory.bookingRanges?.[0] ?? {};
  const expPatch = await api("PATCH", `/api/packages/${pkgId}`, {
    pricing: {
      ...(reread?.pricing ?? {}),
      hotelCategories: [
        { ...firstCategory, departureMonths: [], bookingRanges: [{ ...firstRange, toDate: validityTo }] },
      ],
    },
    supplier_quote_tool: {
      ...(reread?.supplier_quote_tool ?? {}),
      notes: "quote request",
      toEmails: [`${TAG}@supplier.example.test`],
    },
  });
  expectStatus(area, "PATCH pricing booking range + quote recipients", expPatch, 200);
  const expiring = (await api("GET", "/api/packages/expiring-rates")).json?.packages ?? [];
  const quoted = (await api("GET", "/api/packages/supplier-quotes")).json?.packages ?? [];
  const statsAfter = (await api("GET", "/api/packages/stats")).json?.stats ?? {};
  record(area, "expiring-rates lists package whose latest pricing toDate is within 30 days",
    expiring.some((pkg) => pkg.id === pkgId && pkg.rate_valid_to === validityTo), `${expiring.length} listed`);
  record(area, "supplier-quotes lists package with stored quote data",
    quoted.some((pkg) => pkg.id === pkgId), `${quoted.length} listed`);
  record(area, "stats expiring_rates / supplier_quotes count stored data (not hardcoded)",
    statsAfter.expiring_rates >= 1 && statsAfter.supplier_quotes >= 1 &&
      statsAfter.expiring_rates >= (statsBefore.expiring_rates ?? 0),
    JSON.stringify({ before: [statsBefore.expiring_rates, statsBefore.supplier_quotes], after: [statsAfter.expiring_rates, statsAfter.supplier_quotes] }));

  const del = await api("DELETE", `/api/packages/${pkgId}`);
  expectStatus(area, "DELETE /api/packages/:id", del, 200);
  const after = await sql("SELECT status, is_archive FROM tbl_packages WHERE id = ?", [pkgId]);
  record(area, "package soft-deleted in tbl_packages", Number(after[0]?.status) === 0);
}

async function testPromotions() {
  const area = "promotions";
  const created = [];
  cleanups.push(async () => {
    for (const id of created) {
      const blob = await settingsBlob("promotion", id);
      if (blob) await sql("DELETE FROM tbl_settings WHERE id = ?", [blob.rowId]);
    }
  });
  const create = {
    title: `Promo ${TAG}`,
    valid_from: "2026-11-01",
    valid_to: "2026-12-31",
    discount_type: "percentage",
    value: 15,
    package_keys: ["wizard:1", "legacy:2"],
    status: "active",
  };
  const id = await crudModule({
    area,
    base: "/api/promotions",
    create,
    update: { body: { ...create, title: `Promo ${TAG} v2`, value: 20 } },
    extraRead: async (promoId) => {
      created.push(promoId);
      const blob = await settingsBlob("promotion", promoId);
      record(area, "JSON row exists in tbl_settings (promotion)", blob?.data?.title === create.title);
    },
  });
  if (id) record(area, "tbl_settings row removed after delete", !(await settingsBlob("promotion", id)));

  const again = await api("POST", "/api/promotions", create);
  const againId = pickRecord(again.json)?.id;
  if (againId) {
    created.push(againId);
    const toggled = await api("PATCH", `/api/promotions/${againId}/status`, { status: "inactive" });
    expectStatus(area, "PATCH /:id/status", toggled, 200);
    const blob = await settingsBlob("promotion", againId);
    record(area, "status change stored in MySQL", blob?.data?.status === "inactive");
    await api("DELETE", `/api/promotions/${againId}`);
  }
  const bad = await api("POST", "/api/promotions", { ...create, value: 150 });
  expectStatus(area, "rejects percentage > 100", bad, 400);
}

async function testUsersAndPermissions(admin) {
  const area = "users";
  const role = `${TAG}_role`.slice(0, 40);
  const renamed = `${role}_b`;
  // tbl_roles.role_name holds a display label; the app matches it by normalized key.
  const roleKeySql = "LOWER(REGEXP_REPLACE(TRIM(role_name), '[^A-Za-z0-9]+', '_')) = ?";
  let userId = null;
  cleanups.push(async () => {
    if (userId) await sql("DELETE FROM tbl_user WHERE id = ?", [userId]);
    await sql("DELETE FROM tbl_user WHERE user_email = ?", [`${TAG}.user@example.test`]);
    await sql(`DELETE FROM tbl_roles WHERE ${roleKeySql} OR ${roleKeySql}`, [role, renamed]);
    if (userId) {
      const blob = await settingsBlob("user_permissions", userId);
      if (blob) await sql("DELETE FROM tbl_settings WHERE id = ?", [blob.rowId]);
    }
  });

  const created = await api("POST", "/api/users", {
    email: `${TAG}.user@example.test`,
    password: "E2eUserPass123",
    fullName: "E2E Created User",
    role,
  });
  if (!expectStatus(area, "POST /api/users", created, 201)) return;
  userId = created.json?.user?.id ?? null;
  const userRows = await sql("SELECT id, first_name, user_type FROM tbl_user WHERE user_email = ?", [`${TAG}.user@example.test`]);
  record(area, "user row exists in tbl_user", userRows.length === 1, created.json?.status);
  userId = userId ?? userRows[0]?.id ?? null;
  const roleRows = await sql(`SELECT id FROM tbl_roles WHERE ${roleKeySql}`, [role]);
  record(area, "custom role created in tbl_roles", roleRows.length === 1);

  if (userId) {
    const patched = await api("PATCH", `/api/users/${userId}`, { fullName: "E2E Renamed User", isActive: false });
    expectStatus(area, "PATCH /api/users/:id", patched, 200);
    const row = await sql("SELECT first_name, last_name, status FROM tbl_user WHERE id = ?", [userId]);
    record(area, "name + status updated in tbl_user", row[0]?.first_name === "E2E" && Number(row[0]?.status) !== 1, JSON.stringify(row[0]));
    const fetched = await api("GET", `/api/users/${userId}`);
    if (created.json?.status === "pending_verification") {
      record(area, "pending (unverified) user is hidden from GET /:id", fetched.status === 404);
    } else {
      expectStatus(area, "GET /api/users/:id", fetched, 200);
    }
  }
  expectStatus(area, "GET /api/users", await api("GET", "/api/users"), 200);
  expectStatus(area, "GET /api/users/stats", await api("GET", "/api/users/stats"), 200);

  // ---- permissions
  const parea = "permissions";
  expectStatus(parea, "GET /api/permissions", await api("GET", "/api/permissions"), 200);
  expectStatus(parea, "GET /api/permissions/me", await api("GET", "/api/permissions/me"), 200);

  const perms = [
    { moduleKey: "blogs", canView: true, canEdit: true, canDelete: false },
    { moduleKey: "packages", canView: true, canEdit: false, canDelete: false },
  ];
  const putRole = await api("PUT", `/api/permissions/${role}`, { permissions: perms });
  expectStatus(parea, "PUT /api/permissions/:role", putRole, 200);
  const roleRow = await sql(`SELECT id, roles FROM tbl_roles WHERE ${roleKeySql}`, [role]);
  const [permBlob] = roleRow[0]
    ? await sql(
        "SELECT setting_content FROM tbl_settings WHERE setting_type = 'role_permissions' AND setting_name = ?",
        [`role_${roleRow[0].id}`]
      )
    : [];
  const storedPerms = permBlob ? JSON.parse(permBlob.setting_content) : [];
  const storedBlogs = Array.isArray(storedPerms) ? storedPerms.find((p) => p.moduleKey === "blogs") : null;
  record(parea, "role permission matrix stored in tbl_settings (role_permissions)",
    storedBlogs?.canView === true && storedBlogs?.canEdit === true && storedBlogs?.canDelete === false,
    JSON.stringify(storedBlogs));
  record(parea, "tbl_roles.roles left as legacy CSV (no JSON written)",
    !String(roleRow[0]?.roles ?? "").trim().startsWith("[") && !String(roleRow[0]?.roles ?? "").includes("{"));

  if (userId) {
    const overrides = [{ moduleKey: "pages", canView: true, canEdit: true, canDelete: true }];
    const putUser = await api("PUT", `/api/permissions/users/${userId}`, { permissions: overrides });
    expectStatus(parea, "PUT /api/permissions/users/:id", putUser, 200);
    const blob = await settingsBlob("user_permissions", userId);
    record(parea, "user overrides stored in tbl_settings keyed by user id", Boolean(blob?.data?.permissions?.some((p) => p.moduleKey === "pages")));
    const getUser = await api("GET", `/api/permissions/users/${userId}`);
    record(parea, "GET user overrides returns them", Boolean(getUser.json?.overrides?.some((p) => p.moduleKey === "pages")));
    const other = await api("GET", `/api/permissions/users/${admin.id}`);
    record(parea, "another user does not inherit those overrides", Array.isArray(other.json?.overrides) && !other.json.overrides.some((p) => p.moduleKey === "pages"));
    expectStatus(parea, "DELETE /api/permissions/users/:id", await api("DELETE", `/api/permissions/users/${userId}`), 200);
    record(parea, "user overrides removed from MySQL", !(await settingsBlob("user_permissions", userId)));
  }

  await snapshotNamedSetting("access_control", "role_meta");
  await snapshotNamedSetting("access_control", "employee_profiles");
  await snapshotNamedSetting("access_control", "access_activity");

  const meta = await api("PUT", `/api/permissions/access-meta/roles/${role}`, {
    description: "E2E role",
    department: "QA",
    designation: "Tester",
  });
  expectStatus(parea, "PUT access-meta role details", meta, 200);
  const metaRow = await namedSetting("access_control", "role_meta");
  record(parea, "role details stored in MySQL", Boolean(metaRow?.setting_content.includes("E2E role")));

  if (userId) {
    const prof = await api("PUT", `/api/permissions/access-meta/employees/${userId}`, {
      designation: "QA Lead",
      department: "QA",
      accessLevel: "Advanced",
    });
    expectStatus(parea, "PUT access-meta employee profile", prof, 200);
    const profRow = await namedSetting("access_control", "employee_profiles");
    record(parea, "employee profile stored in MySQL", Boolean(profRow?.setting_content.includes("QA Lead")));
  }

  const act = await api("POST", "/api/permissions/access-meta/activity", {
    entries: [{ actor: "E2E", employee: TAG, permission: "test", previousAccess: "OFF", newAccess: "ON" }],
  });
  expectStatus(parea, "POST access-meta activity", act, 201);
  const actRow = await namedSetting("access_control", "access_activity");
  record(parea, "activity entry stored in MySQL", Boolean(actRow?.setting_content.includes(TAG)));
  const all = await api("GET", "/api/permissions/access-meta");
  record(parea, "GET access-meta returns stored data", Boolean(all.json?.roleMeta?.[role] && all.json?.activity?.some((a) => a.employee === TAG)));

  const rename = await api("PATCH", `/api/permissions/${role}`, { role: renamed });
  expectStatus(parea, "PATCH /api/permissions/:role (rename)", rename, 200);
  const renamedRow = await sql(`SELECT id FROM tbl_roles WHERE ${roleKeySql}`, [renamed]);
  record(parea, "role renamed in tbl_roles", renamedRow.length === 1);
  const metaAfterRename = await api("GET", "/api/permissions/access-meta");
  record(parea, "role details follow the rename", Boolean(metaAfterRename.json?.roleMeta?.[renamed] && !metaAfterRename.json?.roleMeta?.[role]));

  expectStatus(parea, "POST /api/permissions/:role/reset", await api("POST", `/api/permissions/${renamed}/reset`, {}), 200);

  const delRole = await api("DELETE", `/api/permissions/${renamed}`);
  expectStatus(parea, "DELETE /api/permissions/:role", delRole, 200);
  const gone = await sql(`SELECT id FROM tbl_roles WHERE ${roleKeySql}`, [renamed]);
  record(parea, "role removed from tbl_roles", gone.length === 0);

  if (userId) {
    const del = await api("DELETE", `/api/users/${userId}`);
    expectStatus(area, "DELETE /api/users/:id", del, 200);
    const left = await sql("SELECT id FROM tbl_user WHERE id = ?", [userId]);
    record(area, "user removed from tbl_user", left.length === 0);
  }
}

async function testEnquiries() {
  const area = "enquiries";
  const columns = await sql(
    `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_message'
       AND IS_NULLABLE = 'NO' AND COLUMN_DEFAULT IS NULL AND EXTRA NOT LIKE '%auto_increment%'`
  );
  const values = {};
  for (const col of columns) {
    const type = String(col.DATA_TYPE).toLowerCase();
    values[col.COLUMN_NAME] = /int|decimal|float|double/.test(type) ? 0 : /date|time/.test(type) ? new Date() : "";
  }
  Object.assign(values, { first_name: "E2E", last_name: TAG, email: `${TAG}@example.test`, message: "E2E enquiry", message_type: "contactus", status: 1 });
  const keys = Object.keys(values);
  const inserted = await sql(
    `INSERT INTO tbl_message (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    keys.map((k) => values[k])
  );
  const id = inserted.insertId;
  cleanups.push(async () => {
    await sql("DELETE FROM tbl_message WHERE id = ?", [id]);
  });

  expectStatus(area, "GET /api/enquiries", await api("GET", "/api/enquiries"), 200);
  expectStatus(area, "GET /api/enquiries/stats", await api("GET", "/api/enquiries/stats"), 200);
  expectStatus(area, "GET /api/enquiries/:id", await api("GET", `/api/enquiries/${id}`), 200);
  const patched = await api("PATCH", `/api/enquiries/${id}`, { status: "closed" });
  expectStatus(area, "PATCH /api/enquiries/:id", patched, 200);
  const row = await sql("SELECT status FROM tbl_message WHERE id = ?", [id]);
  record(area, "status stored in tbl_message", Number(row[0]?.status) === 2);
  expectStatus(area, "DELETE /api/enquiries/:id", await api("DELETE", `/api/enquiries/${id}`), 200);
  const left = await sql("SELECT id FROM tbl_message WHERE id = ?", [id]);
  record(area, "row removed from tbl_message", left.length === 0);
}

async function testMedia() {
  const area = "media";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), `${TAG}.png`);
  const res = await api("POST", "/api/media/upload?kind=image", form);
  if (!expectStatus(area, "POST /api/media/upload (png)", res, [200, 201])) return;
  const url = res.json?.url ?? res.json?.path ?? res.json?.file?.url;
  const local = url ? path.join(process.cwd(), url.replace(/^\//, "")) : "";
  record(area, "uploaded file written to disk", Boolean(local && existsSync(local)), url);
  if (local && existsSync(local)) unlinkSync(local);

  const bad = new FormData();
  bad.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), `${TAG}.html`);
  const rejected = await api("POST", "/api/media/upload?kind=image", bad);
  expectStatus(area, "rejects .html upload", rejected, 400);
}

async function testAuthFlows(admin) {
  const area = "auth";
  const saved = cookie;
  cookie = "";
  try {
    const signup = await api("POST", "/api/auth/signup", {
      email: `${TAG}.signup@example.test`,
      password: "E2eSignupPass123",
      fullName: "E2E Signup",
    });
    record(area, "POST /signup handled (disabled or pending)", [201, 403, 503].includes(signup.status), `HTTP ${signup.status}`);
    const signupRows = await sql("SELECT email_verified, status FROM tbl_user WHERE user_email = ?", [`${TAG}.signup@example.test`]);
    if (signup.status === 201) {
      record(area, "signup stores an unverified user in tbl_user", signupRows.length === 1 && Number(signupRows[0].email_verified) === 0);
    } else {
      record(area, "rejected signup writes nothing to tbl_user", signupRows.length === 0);
    }
    await sql("DELETE FROM tbl_user WHERE user_email = ? AND email_verified = 0", [`${TAG}.signup@example.test`]);

    expectStatus(area, "POST /verify-email rejects bad token", await api("POST", "/api/auth/verify-email", { token: "x".repeat(40) }), 400);
    expectStatus(area, "POST /reset-password rejects bad token", await api("POST", "/api/auth/reset-password", { token: "x".repeat(40), password: "NewPassword123" }), 400);

    const unknown = await api("POST", "/api/auth/forgot-password", { email: `${TAG}.nobody@example.test` });
    expectStatus(area, "POST /forgot-password unknown email gives generic reply", unknown, [200, 503]);
    const forgot = await api("POST", "/api/auth/forgot-password", { email: admin.email });
    if (expectStatus(area, "POST /forgot-password", forgot, [200, 503])) {
      const [row] = await sql("SELECT email_verification_token, email_verification_expires_at FROM tbl_user WHERE id = ?", [admin.id]);
      record(area, "reset token stored hashed in tbl_user with expiry",
        Boolean(row?.email_verification_token) && Boolean(row?.email_verification_expires_at) &&
          !JSON.stringify(forgot.json).includes(String(row?.email_verification_token)));
    }
    const resend = await api("POST", "/api/auth/resend-verification", { email: `${TAG}.nobody@example.test` });
    expectStatus(area, "POST /resend-verification gives generic reply", resend, [200, 503]);
  } finally {
    cookie = saved;
  }
}

async function testLogout() {
  const res = await api("POST", "/api/auth/logout");
  expectStatus("auth", "POST /logout", res, 200);
  const saved = cookie;
  cookie = "";
  expectStatus("auth", "GET /me after logout (no cookie) is 401", await api("GET", "/api/auth/me"), 401);
  cookie = saved;
}

// ---------------------------------------------------------------- run

let admin;
try {
  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`API not reachable at ${BASE}`);
  admin = await createTestAdmin();
  await testAuth(admin);
  const suites = [
    testDashboard,
    testSettings,
    testPackageCategories,
    testBlogCategories,
    testBlogs,
    testPages,
    testPricingRules,
    testPackageTemplates,
    testSuppliers,
    testPackages,
    testPromotions,
    () => testUsersAndPermissions(admin),
    testEnquiries,
    testMedia,
    () => testAuthFlows(admin),
  ];
  for (const suite of suites) {
    try {
      await suite();
    } catch (error) {
      record(suite.name || "suite", "threw", false, error instanceof Error ? error.message : String(error));
    }
  }
  await testLogout();
} catch (error) {
  record("setup", "fatal", false, error instanceof Error ? error.message : String(error));
} finally {
  for (const cleanup of cleanups.reverse()) {
    try {
      await cleanup();
    } catch (error) {
      console.error("cleanup failed:", error instanceof Error ? error.message : error);
    }
  }
  await db.end();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(` - [${f.area}] ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
    process.exitCode = 1;
  }
}
