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

  const sqlPath = path.join(__dirname, "migrate-alter-role-permissions-role-string.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("Connecting to MySQL...");
  const connection = await mysql.createConnection(config);

  try {
    console.log("Running migrate-alter-role-permissions-role-string.sql...");
    await connection.query(sql);
    console.log("role_permissions.role now supports custom roles.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Role permissions migration failed:", error.message);
  process.exit(1);
});
