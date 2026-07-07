import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSql(connection, filename) {
  const sqlPath = path.join(__dirname, filename);
  const sql = fs.readFileSync(sqlPath, "utf8");
  console.log(`Running ${filename}...`);
  await connection.query(sql);
}

async function main() {
  const config = {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  };

  console.log("Connecting to MySQL...");
  const connection = await mysql.createConnection(config);

  try {
    await runSql(connection, "migrate-add-pricing-rules.sql");
    await runSql(connection, "seed-pricing-rules.sql");
    console.log("Pricing rules tables and seed data are ready.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Pricing rules migration failed:", error.message);
  process.exit(1);
});
