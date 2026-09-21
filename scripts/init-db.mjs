import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { prepareSql } from "./db-migrate-util.mjs";

config({ path: ".env.local" });
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const database = process.env.DB_NAME ?? "fz";
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  });

  try {
    const sqlPath = path.join(__dirname, "init-db.sql");
    const raw = fs.readFileSync(sqlPath, "utf8");
    const sql = prepareSql(raw, database);
    console.log(`Running init-db.sql for '${database}'...`);
    await connection.query(sql);
    console.log(`Database '${database}' is ready.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Database init failed:", error.message);
  process.exit(1);
});
