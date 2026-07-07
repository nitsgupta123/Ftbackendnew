import type { FastifyRequest } from "fastify";
import { auditContextFromHeader, AUDIT_USER_HEADER } from "../../src/lib/audit-context";

export function getRequestAudit(request: FastifyRequest) {
  if (request.user?.name) {
    return { user: request.user.name };
  }
  return auditContextFromHeader(request.headers[AUDIT_USER_HEADER]);
}

export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } }
) {
  if (request.user?.role !== "super_admin") {
    return reply.status(403).send({
      error: "Forbidden",
      message: "Only Super Admin can perform this action",
    });
  }
}
