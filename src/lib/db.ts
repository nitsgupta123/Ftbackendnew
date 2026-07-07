import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { mysqlPool: mysql.Pool | undefined };

type QueryParam = string | number | boolean | null | Date | Buffer;

export type { QueryParam };

export function getDbConfig() {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "fz",
  };
}

export function getPool(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    globalForDb.mysqlPool = mysql.createPool({
      ...getDbConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60_000,
      enableKeepAlive: true,
    });
  }

  return globalForDb.mysqlPool;
}

export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { code?: string; errno?: number; fatal?: boolean };
  if (err.code === "ECONNREFUSED" || err.code === "PROTOCOL_CONNECTION_LOST") {
    return true;
  }

  const aggregateErrors = (error as { aggregateErrors?: unknown[] }).aggregateErrors;
  if (Array.isArray(aggregateErrors)) {
    return aggregateErrors.some((nested) => isDbConnectionError(nested));
  }

  return false;
}

export async function verifyDbConnection(
  retries = 10,
  delayMs = 1_000
): Promise<void> {
  const pool = getPool();
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: QueryParam[] = []
): Promise<T> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}
