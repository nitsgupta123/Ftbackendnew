import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { mysqlPool: mysql.Pool | undefined };

type QueryParam = string | number | boolean | null | Date | Buffer;

export type { QueryParam };

/** Singapore Standard Time — used for all admin datetime storage/display. */
export const DB_TIME_ZONE = "+08:00";

export function getDbConfig() {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "fz",
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

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: QueryParam[] = []
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.query(`SET time_zone = '${DB_TIME_ZONE}'`);
    const [rows] = await connection.execute(sql, params);
    return rows as T;
  } finally {
    connection.release();
  }
}
