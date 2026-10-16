/**
 * Temporary super admin for manual UI testing against the local DB.
 *   node scripts/ui-test-admin.mjs create <outfile>   writes {email,password} to outfile
 *   node scripts/ui-test-admin.mjs remove             deletes every ui-test account and
 *                                                     records named "QA UI ..." created while testing
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const db = await mysql.createConnection({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "fz",
});

const [mode, outfile] = process.argv.slice(2);
if (mode === "create") {
  const email = `uitest${Date.now().toString(36)}@example.test`;
  const password = `${randomBytes(12).toString("base64url")}A1`;
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO tbl_user (
       user_name, password, user_email, first_name, last_name,
       country_code, phone, birthday, place_birth, gender, country, user_img,
       insert_date, edit_date, user_type, status, email_verified, user_id
     ) VALUES (?, ?, ?, 'UI', 'Tester', '', '', '', '', '', '', '', NOW(), NOW(), '1', 1, 1, 0)`,
    [email, hash, email]
  );
  writeFileSync(outfile, JSON.stringify({ email, password }));
  console.log(`created ${email}`);
} else if (mode === "remove") {
  const [cats] = await db.query("SELECT id FROM tbl_categories WHERE cat_title LIKE 'QA UI %'");
  const [sups] = await db.query("SELECT id FROM suppliers WHERE company_name LIKE 'QA UI %'");
  const [blobs] = await db.query(
    "SELECT id, setting_type, setting_content FROM tbl_settings WHERE setting_type IN ('category_extras', 'supplier_extras')"
  );
  const orphanIds = blobs
    .filter((row) => {
      let data;
      try {
        data = JSON.parse(row.setting_content);
      } catch {
        return false;
      }
      const owners = row.setting_type === "category_extras" ? cats : sups;
      return owners.some((owner) => Number(owner.id) === Number(data?.id));
    })
    .map((row) => row.id);
  if (orphanIds.length) {
    await db.query("DELETE FROM tbl_settings WHERE id IN (?)", [orphanIds]);
  }
  console.log(`removed ${orphanIds.length} extras`);
  const statements = [
    ["users", "DELETE FROM tbl_user WHERE user_email LIKE 'uitest%@example.test'"],
    ["categories", "DELETE FROM tbl_categories WHERE cat_title LIKE 'QA UI %'"],
    ["suppliers", "DELETE FROM suppliers WHERE company_name LIKE 'QA UI %'"],
    ["settings", "DELETE FROM tbl_settings WHERE setting_content LIKE '%\"QA UI %'"],
  ];
  for (const [label, sql] of statements) {
    const [result] = await db.query(sql);
    console.log(`removed ${result.affectedRows} ${label}`);
  }
}
await db.end();
