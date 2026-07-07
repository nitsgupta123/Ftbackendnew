import type { FastifyReply } from "fastify";
import { isDbConnectionError } from "../../src/lib/db";

export function sendRouteError(reply: FastifyReply, error: unknown, fallback: string) {
  if (isDbConnectionError(error)) {
    return reply.status(503).send({
      error: "Database is unavailable. Start MySQL and try again.",
    });
  }

  return reply.status(500).send({
    error: error instanceof Error ? error.message : fallback,
  });
}
