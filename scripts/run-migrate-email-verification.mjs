import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbName = process.env.DB_NAME ?? "fz";
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  });

  try {
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'email_verified'`,
      [dbName]
    );

    if (Array.isArray(cols) && cols.length > 0) {
      console.log("email_verified column already exists — skipping migration.");
      return;
    }

    const sqlPath = path.join(__dirname, "migrate-add-email-verification.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Running migrate-add-email-verification.sql...");
    await connection.query(sql);
    console.log("Email verification columns are ready.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Email verification migration failed:", error.message);
  process.exit(1);
});
