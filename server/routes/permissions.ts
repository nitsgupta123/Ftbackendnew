import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  clearUserPermissionOverrides,
  deleteRole,
  diffFromRoleDefaults,
  getEffectivePermissionMatrix,
  getPermissionsPayload,
  getRolePermissionMatrix,
  getUserPermissionOverrides,
  renameRole,
  resetRolePermissions,
  setUserPermissionOverrides,
  updateRolePermissions,
} from "../../src/lib/permission-repository";
import { ACCESS_MODULE_KEYS } from "../../src/lib/permission-types";
import type { AdminRole } from "../../src/lib/auth-types";
import { findAdminUserById } from "../../src/lib/auth-repository";

const roleSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/);

const modulePermissionSchema = z.object({
  moduleKey: z.string().trim().min(1).max(80),
  canView: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
});

const updatePermissionsSchema = z.object({
  permissions: z.array(modulePermissionSchema).min(1),
});

const updateUserPermissionsSchema = z.object({
  permissions: z.array(modulePermissionSchema),
});

const renameRoleSchema = z.object({
  role: roleSchema,
});

const protectedRoles = new Set(["admin", "super_admin", "owner"]);

function canManageAccess(role: string | undefined): boolean {
  return role === "super_admin" || role === "owner";
}

async function requireAccessManager(
  request: { user?: { role?: string } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } }
) {
  if (!canManageAccess(request.user?.role)) {
    return reply.status(403).send({
      error: "Forbidden",
      message: "Only Super Admin or Owner can manage employee access",
    });
  }
}

export const registerPermissionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/", async (_request, reply) => {
    try {
      const payload = await getPermissionsPayload();
      return reply.send(payload);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to load permissions",
      });
    }
  });

  app.get("/me", async (request, reply) => {
    try {
      const role = (request.user.role ?? "admin") as AdminRole;
      const matrix = await getEffectivePermissionMatrix(request.user.sub, role);
      return reply.send({ matrix });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to load your permissions",
      });
    }
  });

  app.get("/users/:userId", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const userId = Number((request.params as { userId?: string }).userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.status(400).send({ error: "Invalid user id" });
      }

      const target = await findAdminUserById(userId);
      if (!target) {
        return reply.status(404).send({ error: "User not found" });
      }

      const [roleMatrix, overrides] = await Promise.all([
        getRolePermissionMatrix(target.role as AdminRole),
        getUserPermissionOverrides(userId),
      ]);

      return reply.send({
        userId,
        role: target.role,
        rolePermissions: roleMatrix.permissions,
        overrides,
        effective: await getEffectivePermissionMatrix(userId, target.role as AdminRole),
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to load user permissions",
      });
    }
  });

  app.put("/users/:userId", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const userId = Number((request.params as { userId?: string }).userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.status(400).send({ error: "Invalid user id" });
      }

      const target = await findAdminUserById(userId);
      if (!target) {
        return reply.status(404).send({ error: "User not found" });
      }

      const bodyParsed = updateUserPermissionsSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyParsed.error.flatten().fieldErrors,
        });
      }

      const allowed = new Set(ACCESS_MODULE_KEYS);
      const unknown = bodyParsed.data.permissions.filter((p) => !allowed.has(p.moduleKey));
      if (unknown.length > 0) {
        return reply.status(400).send({
          error: "Unknown module keys",
          details: unknown.map((p) => p.moduleKey),
        });
      }

      const roleMatrix = await getRolePermissionMatrix(target.role as AdminRole);
      const onlyDiffs = diffFromRoleDefaults(
        roleMatrix.permissions,
        bodyParsed.data.permissions
      );
      const overrides = await setUserPermissionOverrides(userId, onlyDiffs);
      const effective = await getEffectivePermissionMatrix(
        userId,
        target.role as AdminRole
      );

      return reply.send({
        userId,
        role: target.role,
        overrides,
        effective,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to update user permissions",
      });
    }
  });

  app.delete("/users/:userId", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const userId = Number((request.params as { userId?: string }).userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.status(400).send({ error: "Invalid user id" });
      }

      const target = await findAdminUserById(userId);
      if (!target) {
        return reply.status(404).send({ error: "User not found" });
      }

      await clearUserPermissionOverrides(userId);
      const effective = await getEffectivePermissionMatrix(
        userId,
        target.role as AdminRole
      );

      return reply.send({
        userId,
        role: target.role,
        overrides: [],
        effective,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to reset user permissions",
      });
    }
  });

  app.put("/:role", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const roleParsed = roleSchema.safeParse(
        (request.params as { role?: string }).role
      );
      if (!roleParsed.success) {
        return reply.status(400).send({ error: "Invalid role" });
      }

      const bodyParsed = updatePermissionsSchema.safeParse(request.body);
      if (!bodyParsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyParsed.error.flatten().fieldErrors,
        });
      }

      const allowed = new Set(ACCESS_MODULE_KEYS);
      const unknown = bodyParsed.data.permissions.filter(
        (p) => !allowed.has(p.moduleKey)
      );
      if (unknown.length > 0) {
        return reply.status(400).send({
          error: "Unknown module keys",
          details: unknown.map((p) => p.moduleKey),
        });
      }

      const matrix = await updateRolePermissions(
        roleParsed.data,
        bodyParsed.data.permissions
      );
      return reply.send({ matrix });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to update permissions",
      });
    }
  });

  app.patch("/:role", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const currentRoleParsed = roleSchema.safeParse(
        (request.params as { role?: string }).role
      );
      const bodyParsed = renameRoleSchema.safeParse(request.body);
      if (!currentRoleParsed.success || !bodyParsed.success) {
        return reply.status(400).send({ error: "Invalid role" });
      }

      const currentRole = currentRoleParsed.data;
      const nextRole = bodyParsed.data.role;
      if (protectedRoles.has(currentRole)) {
        return reply.status(400).send({ error: "This role cannot be renamed" });
      }
      if (currentRole !== nextRole) {
        await renameRole(currentRole, nextRole);
      }

      const matrix = await getRolePermissionMatrix(nextRole);
      return reply.send({ matrix });
    } catch (error) {
      app.log.error(error);
      const message = error instanceof Error ? error.message : "Failed to rename role";
      return reply.status(message.includes("already exists") ? 409 : 500).send({
        error: message,
      });
    }
  });

  app.delete("/:role", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const roleParsed = roleSchema.safeParse(
        (request.params as { role?: string }).role
      );
      if (!roleParsed.success) {
        return reply.status(400).send({ error: "Invalid role" });
      }
      if (protectedRoles.has(roleParsed.data)) {
        return reply.status(400).send({ error: "This role cannot be deleted" });
      }

      await deleteRole(roleParsed.data);
      return reply.send({ success: true, reassignedRole: "admin" });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Failed to delete role",
      });
    }
  });

  app.post("/:role/reset", async (request, reply) => {
    const denied = await requireAccessManager(request, reply);
    if (denied) return;

    try {
      const roleParsed = roleSchema.safeParse(
        (request.params as { role?: string }).role
      );
      if (!roleParsed.success) {
        return reply.status(400).send({ error: "Invalid role" });
      }

      const matrix = await resetRolePermissions(roleParsed.data);
      return reply.send({ matrix });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to reset permissions",
      });
    }
  });
};
