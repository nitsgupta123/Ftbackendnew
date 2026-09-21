import type { FastifyReply } from "fastify";
import { isDbConnectionError } from "../../src/lib/db";

const DRIVER_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_DBACCESS_DENIED_ERROR",
  "ER_NO_SUCH_TABLE",
  "ER_BAD_FIELD_ERROR",
  "ER_DUP_ENTRY",
  "ER_PARSE_ERROR",
  "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD",
]);

export function isDatabaseError(error: unknown): boolean {
  if (isDbConnectionError(error)) return true;
  if (!error || typeof error !== "object") return false;

  const err = error as {
    code?: string;
    errno?: number;
    sqlMessage?: string;
    sqlState?: string;
  };

  if (err.sqlMessage || err.sqlState) return true;
  if (typeof err.errno === "number" && err.errno !== 0) return true;
  if (err.code && (DRIVER_ERROR_CODES.has(err.code) || err.code.startsWith("ER_"))) {
    return true;
  }

  return false;
}

/** Never return MySQL / driver internals to API clients. */
export function getSafeErrorMessage(error: unknown, fallback: string): string {
  if (isDbConnectionError(error)) {
    return "Database is unavailable. Start MySQL and try again.";
  }
  if (isDatabaseError(error)) {
    return fallback;
  }
  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  if (!message || message.length > 240) return fallback;
  if (/sqlmessage|econn|enoent|eacces|mysql|node_modules|\bat\s+\S+\s+\(/i.test(message)) {
    return fallback;
  }
  return message;
}

export function sendRouteError(reply: FastifyReply, error: unknown, fallback: string) {
  if (isDbConnectionError(error)) {
    return reply.status(503).send({
      error: "Database is unavailable. Start MySQL and try again.",
    });
  }

  return reply.status(500).send({
    error: getSafeErrorMessage(error, fallback),
  });
}
