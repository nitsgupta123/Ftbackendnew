import type { FastifyPluginAsync } from "fastify";
import { getSafeErrorMessage } from "../lib/errors";
import {
  createAdminUserByAdmin,
  deleteAdminUser,
  deletePendingSignupByEmail,
  findAdminByEmail,
  findAdminUserById,
  getAdminUserStats,
  listAdminUsers,
  updateAdminUser,
} from "../../src/lib/auth-repository";
import { createUserSchema, updateUserSchema } from "../../src/lib/auth-validation";
import { isEmailConfigured } from "../../src/lib/email";
import { sendAdminVerificationEmail } from "../../src/lib/verification-email";
import { requireModuleAccess, requireSuperAdmin } from "../lib/audit";

function parseRole(value?: string): string | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return /^[a-z][a-z0-9_]*$/.test(normalized) ? normalized : undefined;
}

function parseStatus(value?: string): "active" | "inactive" | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  if (value === "active" || value === "inactive") return value;
  return undefined;
}

export const registerUserRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", requireModuleAccess(["users", "roles"]));

  app.get("/stats", async (_request, reply) => {
    try {
      const stats = await getAdminUserStats();
      return reply.send({ stats });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch user stats"),
      });
    }
  });

  app.get("/", async (request, reply) => {
    try {
      const query = request.query as Record<string, string | undefined>;
      const result = await listAdminUsers({
        search: query.search,
        role: parseRole(query.role) ?? "all",
        status: parseStatus(query.status) ?? "all",
        sort:
          query.sort === "full_name" || query.sort === "last_login_at"
            ? query.sort
            : "created_at",
        order: query.order === "asc" ? "asc" : "desc",
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      });
      return reply.send(result);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to list users"),
      });
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = Number(id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      const user = await findAdminUserById(userId);
      if (!user || !user.emailVerified) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send({ user });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to fetch user"),
      });
    }
  });

  app.post("/", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const parsed = createUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password, fullName, role } = parsed.data;
      const existing = await findAdminByEmail(email);
      if (existing && Boolean(existing.email_verified)) {
        return reply.status(409).send({ error: "An account with this email already exists" });
      }

      // No Graph/SMTP: create an active account immediately (admin shares the password).
      if (!isEmailConfigured()) {
        const created = await createAdminUserByAdmin({
          email,
          password,
          fullName,
          role,
          activateImmediately: true,
        });
        const user = await findAdminUserById(created.id);
        app.log.warn(
          { email: created.email },
          "Admin user created without invite email (email not configured)"
        );
        return reply.status(201).send({
          status: "created",
          email: created.email,
          role: created.role,
          user,
          message:
            "User created and activated. Share the password with them — invite email was skipped because email is not configured.",
        });
      }

      const pending = await createAdminUserByAdmin({ email, password, fullName, role });

      try {
        const mailResult = await sendAdminVerificationEmail({
          ...pending,
          invitedByAdmin: true,
        });
        app.log.info(
          { email: pending.email, mailMode: mailResult.mode },
          "Invite verification email sent"
        );
        return reply.status(201).send({
          status: "pending_verification",
          email: pending.email,
          role: pending.role,
          message:
            "Verification email sent. The user will appear in User Management after they verify.",
          previewUrl: mailResult.previewUrl,
          mailMode: mailResult.mode,
        });
      } catch (mailError) {
        app.log.error(mailError);
        await deletePendingSignupByEmail(pending.email);
        // Fall back to immediate activation if mail fails
        const created = await createAdminUserByAdmin({
          email,
          password,
          fullName,
          role,
          activateImmediately: true,
        });
        const user = await findAdminUserById(created.id);
        return reply.status(201).send({
          status: "created",
          email: created.email,
          role: created.role,
          user,
          message:
            "User created and activated. Invite email failed — share the password with them directly.",
        });
      }
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to create user"),
      });
    }
  });

  app.patch("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const userId = Number(id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      const parsed = updateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const existing = await findAdminUserById(userId);
      if (!existing) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (userId === request.user.sub && parsed.data.isActive === false) {
        return reply.status(400).send({ error: "You cannot deactivate your own account" });
      }

      if (
        existing.role === "super_admin" &&
        existing.isActive &&
        parsed.data.isActive === false
      ) {
        const { users } = await listAdminUsers({
          role: "super_admin",
          status: "active",
          limit: 100,
        });
        const otherSuperAdmins = users.filter((u) => u.id !== userId && u.isActive);
        if (!otherSuperAdmins.length) {
          return reply.status(400).send({
            error: "Cannot deactivate the last active Super Admin",
          });
        }
      }

      if (userId === request.user.sub && parsed.data.role && parsed.data.role !== existing.role) {
        return reply.status(400).send({ error: "You cannot change your own role" });
      }

      if (
        existing.role === "super_admin" &&
        parsed.data.role === "admin" &&
        existing.isActive
      ) {
        const { users } = await listAdminUsers({
          role: "super_admin",
          status: "active",
          limit: 100,
        });
        const otherSuperAdmins = users.filter((u) => u.id !== userId && u.isActive);
        if (!otherSuperAdmins.length) {
          return reply.status(400).send({
            error: "Cannot demote the last active Super Admin",
          });
        }
      }

      const user = await updateAdminUser(userId, parsed.data);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      return reply.send({ user });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: getSafeErrorMessage(error, "Failed to update user"),
      });
    }
  });

  app.delete("/:id", async (request, reply) => {
    const forbidden = await requireSuperAdmin(request, reply);
    if (forbidden) return forbidden;

    try {
      const { id } = request.params as { id: string };
      const userId = Number(id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      if (userId === request.user.sub) {
        return reply.status(400).send({ error: "You cannot delete your own account" });
      }

      const existing = await findAdminUserById(userId);
      if (!existing) {
        return reply.status(404).send({ error: "User not found" });
      }

      await deleteAdminUser(userId);
      return reply.send({ success: true });
    } catch (error) {
      app.log.error(error);
      const message = getSafeErrorMessage(error, "Failed to delete user");
      if (message.includes("last active Super Admin")) {
        return reply.status(400).send({ error: message });
      }
      return reply.status(500).send({ error: message });
    }
  });
};
