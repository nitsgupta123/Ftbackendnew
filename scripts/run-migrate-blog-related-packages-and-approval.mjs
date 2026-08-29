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

  console.log("Connecting to MySQL...");
  const connection = await mysql.createConnection(config);

  try {
    const sqlPath = path.join(__dirname, "migrate-blog-related-packages-and-approval.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Running migrate-blog-related-packages-and-approval.sql...");
    await connection.query(sql);
    console.log("Blog related packages + approval workflow migration complete.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Blog related packages/approval migration failed:", error.message);
  process.exit(1);
});
