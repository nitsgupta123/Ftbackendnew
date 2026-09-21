import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

/** Load KEY=VALUE env files without requiring the dotenv package. */
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing/unreadable env files
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.production"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

export function getMigrateDbConfig() {
  const database = process.env.DB_NAME ?? "fz";
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
export function prepareSql(sql, database = process.env.DB_NAME ?? "fz") {
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
