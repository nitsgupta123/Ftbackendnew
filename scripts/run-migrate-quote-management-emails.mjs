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
    database: process.env.DB_NAME ?? "fz",
    multipleStatements: true,
  };

  console.log("Connecting to MySQL...");
  const connection = await mysql.createConnection(config);

  try {
    // MySQL versions without ADD COLUMN IF NOT EXISTS: check information_schema
    const [rows] = await connection.query(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'admin_settings'
          AND COLUMN_NAME IN ('quote_cc_emails', 'quote_bcc_emails')
      `,
      [process.env.DB_NAME ?? "fz"]
    );

    const existing = new Set(
      (rows || []).map((r) => r.COLUMN_NAME)
    );

    if (!existing.has("quote_cc_emails")) {
      console.log("Adding quote_cc_emails...");
      await connection.query(
        `ALTER TABLE admin_settings ADD COLUMN quote_cc_emails VARCHAR(1000) NOT NULL DEFAULT '' AFTER maintenance_mode`
      );
    } else {
      console.log("quote_cc_emails already exists.");
    }

    if (!existing.has("quote_bcc_emails")) {
      console.log("Adding quote_bcc_emails...");
      await connection.query(
        `ALTER TABLE admin_settings ADD COLUMN quote_bcc_emails VARCHAR(1000) NOT NULL DEFAULT '' AFTER quote_cc_emails`
      );
    } else {
      console.log("quote_bcc_emails already exists.");
    }

    console.log("Quote management email columns are ready.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Quote management emails migration failed:", error.message);
  process.exit(1);
});
