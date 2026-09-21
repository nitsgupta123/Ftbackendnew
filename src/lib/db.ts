import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { mysqlPool: mysql.Pool | undefined };

type QueryParam = string | number | boolean | null | Date | Buffer;

export type { QueryParam };

/** Singapore Standard Time — used for all admin datetime storage/display. */
export const DB_TIME_ZONE = "+08:00";

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
]);

function assertSqlIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

/** Safe MySQL database name from env (letters, digits, underscore only). */
export function getSqlDatabaseName(
  envValue: string | undefined,
  fallback: string,
  label = "database name"
): string {
  return assertSqlIdentifier(envValue?.trim() || fallback, label);
}

export function getDbConfig() {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: getSqlDatabaseName(process.env.DB_NAME, "fz", "DB_NAME"),
  };
}

function attachSingaporeTimeZone(pool: mysql.Pool) {
  pool.on("connection", (connection) => {
    connection.query(`SET time_zone = '${DB_TIME_ZONE}'`);
  });
}

export function getPool(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    const pool = mysql.createPool({
      ...getDbConfig(),
      // Driver + session must both use SGT so TIMESTAMP values round-trip correctly.
      timezone: DB_TIME_ZONE,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60_000,
      connectTimeout: 10_000,
      enableKeepAlive: true,
    });
    attachSingaporeTimeZone(pool);
    globalForDb.mysqlPool = pool;
  }

  return globalForDb.mysqlPool;
}

export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { code?: string; errno?: number; fatal?: boolean };
  if (err.code && CONNECTION_ERROR_CODES.has(err.code)) {
    return true;
  }
  if (err.fatal === true) {
    return true;
  }

  const aggregateErrors = (error as { aggregateErrors?: unknown[] }).aggregateErrors;
  if (Array.isArray(aggregateErrors)) {
    return aggregateErrors.some((nested) => isDbConnectionError(nested));
  }

  return false;
}

export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; errno?: number };
  return err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146;
}

export async function verifyDbConnection(
  retries = 10,
  delayMs = 1_000
): Promise<void> {
  const pool = getPool();
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query(`SET time_zone = '${DB_TIME_ZONE}'`);
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

/** Sanitize LIMIT for safe inlining (MySQL prepared stmts reject LIMIT ?). */
export function sqlLimit(value: number, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), 1), max);
}

/** Sanitize OFFSET for safe inlining. */
export function sqlOffset(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(Math.trunc(n), 0);
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: QueryParam[] = []
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.query(`SET time_zone = '${DB_TIME_ZONE}'`);
    // Use text-protocol query (not prepare/execute). Some MySQL builds reject
    // LIMIT/OFFSET placeholders under prepared statements (ER_WRONG_ARGUMENTS).
    const [rows] = await connection.query(sql, params);
    return rows as T;
  } finally {
    connection.release();
  }
}
