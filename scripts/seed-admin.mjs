import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const BCRYPT_ROUNDS = 12;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "FT Super Admin";

const COMPANY_DOMAINS = ["fayyaztravels.com"];
const ALLOWED_EXTRA = new Set(["neetu.inncelerator@gmail.com"]);

function isAllowedAdminEmail(email) {
  if (ALLOWED_EXTRA.has(email)) return true;
  const domain = email.split("@")[1] ?? "";
  return COMPANY_DOMAINS.includes(domain);
}

async function main() {
  if (!ADMIN_EMAIL) {
    throw new Error(
      "ADMIN_EMAIL is required (company email @fayyaztravels.com, or neetu.inncelerator@gmail.com)"
    );
  }
  if (!isAllowedAdminEmail(ADMIN_EMAIL)) {
    throw new Error(
      `ADMIN_EMAIL must be a company-controlled address (@fayyaztravels.com) or neetu.inncelerator@gmail.com. Got: ${ADMIN_EMAIL}`
    );
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "fz",
  });

  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    const [existing] = await connection.query(
      "SELECT id, email, role FROM admin_users WHERE email = ? LIMIT 1",
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE admin_users
         SET password_hash = ?, full_name = ?, role = 'super_admin',
             is_active = 1, email_verified = 1,
             email_verification_token = NULL, email_verification_expires_at = NULL
         WHERE email = ?`,
        [passwordHash, ADMIN_NAME, ADMIN_EMAIL]
      );
      console.log("Updated existing admin account:");
    } else {
      await connection.query(
        `INSERT INTO admin_users
           (email, password_hash, full_name, role, is_active, email_verified)
         VALUES (?, ?, ?, 'super_admin', 1, 1)`,
        [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
      );
      console.log("Created super admin account:");
    }

    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Role:     super_admin`);
    console.log("\nSign in at http://localhost:3000/login");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Admin seed failed:", error.message);
  process.exit(1);
});
