import { config } from "dotenv";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });
config();

export function getMigrateDbConfig() {
  const database = process.env.DB_NAME ?? "fayyaz_new";
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database,
    multipleStatements: true,
  };
}

/** Rewrite hardcoded USE targets so migrations use DB_NAME. */
export function prepareSql(sql, database = process.env.DB_NAME ?? "fayyaz_new") {
  return sql
    .replace(/\bUSE\s+(fz|fayyaz_new)\s*;/gi, `USE \`${database}\`;`)
    .replace(
      /CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+(fz|fayyaz_new)\b/gi,
      `CREATE DATABASE IF NOT EXISTS \`${database}\``
    );
}

export async function runSqlFile(connection, sqlDir, filename, database) {
  const sqlPath = path.join(sqlDir, filename);
  const raw = fs.readFileSync(sqlPath, "utf8");
  const sql = prepareSql(raw, database);
  console.log(`Running ${filename}...`);
  await connection.query(sql);
}

export async function withMigrateConnection(fn) {
  const dbConfig = getMigrateDbConfig();
  console.log(
    `Connecting to MySQL ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}...`
  );
  const connection = await mysql.createConnection(dbConfig);
  try {
    return await fn(connection, dbConfig);
  } finally {
    await connection.end();
  }
}
