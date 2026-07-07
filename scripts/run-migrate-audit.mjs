import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  };

  const sqlPath = path.join(__dirname, "migrate-add-audit-fields.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("Connecting to MySQL...");
  const connection = await mysql.createConnection(config);

  try {
    console.log("Running migrate-add-audit-fields.sql...");
    await connection.query(sql);
    console.log("Audit columns (created_by, updated_by) are ready on add_package.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Audit migration failed:", error.message);
  process.exit(1);
});
