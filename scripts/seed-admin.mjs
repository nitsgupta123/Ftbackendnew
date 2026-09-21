import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@ftadmin.local").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "FtAdmin@12345";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "FT Super Admin";

function md5(password) {
  return createHash("md5").update(password, "utf8").digest("hex");
}

async function main() {
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "fayyaz_new",
  });

  try {
    const passwordHash = md5(ADMIN_PASSWORD);
    const parts = ADMIN_NAME.trim().split(/\s+/);
    const firstName = parts[0] ?? ADMIN_NAME;
    const lastName = parts.slice(1).join(" ");

    const [existing] = await connection.query(
      `SELECT id, user_email, user_type FROM tbl_user
       WHERE LOWER(user_email) = ? AND LOWER(TRIM(user_type)) <> 'front'
       LIMIT 1`,
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      await connection.query(
        `UPDATE tbl_user
         SET password = ?, first_name = ?, last_name = ?, user_type = '1', status = 1, edit_date = NOW()
         WHERE id = ?`,
        [passwordHash, firstName, lastName, existing[0].id]
      );
      console.log("Updated existing admin account in tbl_user:");
    } else {
      await connection.query(
        `INSERT INTO tbl_user (
           user_name, password, user_email, first_name, last_name,
           country_code, phone, birthday, place_birth, gender, country, user_img,
           insert_date, edit_date, user_type, status, user_id
         ) VALUES (?, ?, ?, ?, ?, '', '', '', '', '', '', '', NOW(), NOW(), '1', 1, 0)`,
        [ADMIN_EMAIL, passwordHash, ADMIN_EMAIL, firstName, lastName]
      );
      console.log("Created super admin account in tbl_user:");
    }

    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Role:     super_admin (user_type=1)`);
    console.log("\nSign in at http://localhost:3000/panel/login");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Admin seed failed:", error.message);
  process.exit(1);
});
