import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSql(connection, filename) {
  const sqlPath = path.join(__dirname, filename);
  const sql = fs.readFileSync(sqlPath, "utf8");
  console.log(`Running ${filename}...`);
  await connection.query(sql);
}

async function main() {
  const configDb = {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  };

  console.log("Connecting to MySQL...");
  const connection = await mysql.createConnection(configDb);

  try {
    await runSql(connection, "migrate-alter-user-permissions-bigint-fk.sql");
    console.log("user_permissions.user_id is BIGINT with FK to admin_users.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("user_permissions BIGINT/FK migration failed:", error.message);
  process.exit(1);
});
