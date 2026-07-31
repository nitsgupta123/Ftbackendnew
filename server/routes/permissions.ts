import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireSuperAdmin } from "../lib/audit";
import {
  getPermissionsPayload,
  getRolePermissionMatrix,
  resetRolePermissions,
  updateRolePermissions,
} from "../../src/lib/permission-repository";
import { ACCESS_MODULE_KEYS } from "../../src/lib/permission-types";
import type { AdminRole } from "../../src/lib/auth-types";

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
      const matrix = await getRolePermissionMatrix(role);
      return reply.send({ matrix });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error:
          error instanceof Error ? error.message : "Failed to load your permissions",
      });
    }
  });

  app.put("/:role", async (request, reply) => {
    const denied = await requireSuperAdmin(request, reply);
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

  app.post("/:role/reset", async (request, reply) => {
    const denied = await requireSuperAdmin(request, reply);
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
