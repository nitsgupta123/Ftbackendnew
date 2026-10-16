import type { FastifyReply, FastifyRequest } from "fastify";
import { auditContextFromHeader, AUDIT_USER_HEADER } from "../../src/lib/audit-context";
import type { AdminRole } from "../../src/lib/auth-types";
import { getEffectivePermissionMatrix } from "../../src/lib/permission-repository";
import { hasModulePermission, type PermissionAction } from "../../src/lib/permission-types";

export function getRequestAudit(request: FastifyRequest) {
  if (request.user?.name) {
    const userId = Number(request.user.sub);
    return { user: request.user.name, userId: Number.isInteger(userId) && userId > 0 ? userId : undefined };
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

function actionFor(method: string): PermissionAction | null {
  if (method === "GET" || method === "HEAD") return "view";
  if (method === "DELETE") return "delete";
  if (method === "POST" || method === "PUT" || method === "PATCH") return "edit";
  return null;
}

/**
 * preHandler enforcing the role/user permission matrix: GET → view,
 * POST/PUT/PATCH → edit, DELETE → delete. When several module keys are given the
 * request passes if any of them grants the action (for screens that read another
 * module's data, e.g. the blog editor listing packages).
 * A route can override the modules via `config: { permissionModule: ... }`.
 */
export function requireModuleAccess(defaultModules: string | string[]) {
  return async function moduleAccessGuard(request: FastifyRequest, reply: FastifyReply) {
    const action = actionFor(request.method);
    if (!action) return;

    const role = request.user?.role;
    if (role === "super_admin" || role === "owner") return;

    const configured = request.routeOptions.config.permissionModule ?? defaultModules;
    const moduleKeys = Array.isArray(configured) ? configured : [configured];
    const matrix = await getEffectivePermissionMatrix(
      request.user.sub,
      (role ?? "admin") as AdminRole
    );
    if (!moduleKeys.some((key) => hasModulePermission(matrix.permissions, key, action))) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `You do not have ${action} access to this module`,
      });
    }
  };
}
