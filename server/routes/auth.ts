import type { FastifyPluginAsync } from "fastify";
import {
  countAdminUsers,
  countAllAdminUsers,
  createAdminPasswordReset,
  createBootstrapAdminUser,
  createPendingSignupAdminUser,
  deletePendingSignupByEmail,
  findAdminByEmail,
  findAdminById,
  passwordMatchesAdmin,
  refreshEmailVerificationToken,
  resetAdminPasswordByToken,
  toAuthTokenPayload,
  touchAdminLastLogin,
  verifyAdminEmailByToken,
  verifyAdminPassword,
} from "../../src/lib/auth-repository";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "../../src/lib/auth-validation";
import { isEmailConfigured } from "../../src/lib/email";
import { sendAdminPasswordResetEmail } from "../../src/lib/password-reset-email";
import { sendAdminVerificationEmail } from "../../src/lib/verification-email";
import { sendRouteError } from "../lib/errors";
import { z } from "zod";

const INVALID_CREDENTIALS = "Invalid email or password";
const VERIFY_EMAIL_FIRST = "Please verify your email before signing in";
const RESET_GENERIC =
  "If that email belongs to an admin account, a reset link has been sent.";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const resendSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

function isPublicSignupAllowed(existingUserCount: number): boolean {
  if (existingUserCount === 0) return true;
  return process.env.ALLOW_PUBLIC_SIGNUP === "true";
}

function allowPasswordResetBypass(): boolean {
  return process.env.ADMIN_PASSWORD_RESET_BYPASS === "true";
}

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post("/signup", async (request, reply) => {
    try {
      const existingCount = await countAllAdminUsers();
      if (!isPublicSignupAllowed(existingCount)) {
        return reply.status(403).send({
          error:
            "Public signup is disabled. Ask an administrator to create your account.",
        });
      }

      const parsed = signupSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password, fullName } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await findAdminByEmail(normalizedEmail);
      if (existing && Boolean(existing.email_verified)) {
        return reply.status(409).send({ error: "An account with this email already exists" });
      }

      const verifiedCount = await countAdminUsers();

      if (verifiedCount === 0 && !existing) {
        const user = await createBootstrapAdminUser({ email, password, fullName });
        const token = await reply.jwtSign(toAuthTokenPayload(user));
        return reply.status(201).send({
          status: "authenticated",
          token,
          user,
        });
      }

      if (!isEmailConfigured()) {
        return reply.status(503).send({
          error:
            "Email delivery is not configured. Ask a Super Admin to create your account from User Management.",
        });
      }

      const pending = await createPendingSignupAdminUser({ email, password, fullName });

      try {
        const mailResult = await sendAdminVerificationEmail(pending);
        app.log.info(
          { email: pending.email, mailMode: mailResult.mode },
          "Verification email sent"
        );
        return reply.status(201).send({
          status: "pending_verification",
          email: pending.email,
          message:
            "Check your email (and spam folder) for a verification link. You will appear in User Management after verification.",
          previewUrl: mailResult.previewUrl,
          mailMode: mailResult.mode,
        });
      } catch (mailError) {
        app.log.error(mailError);
        await deletePendingSignupByEmail(pending.email);
        return reply.status(503).send({
          error: "Could not send verification email. Please try again later.",
        });
      }
    } catch (error) {
      app.log.error(error);
      if (error instanceof Error && error.message.includes("already exists")) {
        return reply.status(409).send({ error: error.message });
      }
      return sendRouteError(reply, error, "Signup failed");
    }
  });

  app.post("/resend-verification", async (request, reply) => {
    try {
      const parsed = resendSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      if (!isEmailConfigured()) {
        return reply.status(503).send({ error: "Email delivery is not configured." });
      }

      const email = parsed.data.email.trim().toLowerCase();
      const pending = await refreshEmailVerificationToken(email);

      if (pending) {
        const mailResult = await sendAdminVerificationEmail(pending);
        app.log.info(
          { email: pending.email, mailMode: mailResult.mode },
          "Verification email resent"
        );
        return reply.send({
          status: "ok",
          message: "If that email needs verification, a new link has been sent.",
          previewUrl: mailResult.previewUrl,
          mailMode: mailResult.mode,
        });
      }

      return reply.send({
        status: "ok",
        message: "If that email needs verification, a new link has been sent.",
      });
    } catch (error) {
      app.log.error(error);
      return sendRouteError(reply, error, "Failed to resend verification");
    }
  });

  app.post("/verify-email", async (request, reply) => {
    try {
      const parsed = verifyEmailSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const user = await verifyAdminEmailByToken(parsed.data.token);
      if (!user) {
        return reply.status(400).send({
          error: "Invalid or expired verification link. Please sign up again.",
        });
      }

      const token = await reply.jwtSign(toAuthTokenPayload(user));
      return reply.send({
        status: "authenticated",
        token,
        user,
        message: "Email verified. Your account is now active.",
      });
    } catch (error) {
      app.log.error(error);
      return sendRouteError(reply, error, "Email verification failed");
    }
  });

  app.post("/login", async (request, reply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password } = parsed.data;
      const row = await findAdminByEmail(email.trim().toLowerCase());

      if (row && !Boolean(row.email_verified)) {
        const passwordOk = await passwordMatchesAdmin(row, password);
        if (passwordOk) {
          return reply.status(403).send({ error: VERIFY_EMAIL_FIRST });
        }
        return reply.status(401).send({ error: INVALID_CREDENTIALS });
      }

      if (!row || !(await verifyAdminPassword(row, password))) {
        return reply.status(401).send({ error: INVALID_CREDENTIALS });
      }

      await touchAdminLastLogin(row.id);
      const user = await findAdminById(row.id);
      if (!user) {
        return reply.status(401).send({ error: INVALID_CREDENTIALS });
      }

      const token = await reply.jwtSign(toAuthTokenPayload(user));
      return reply.send({ token, user });
    } catch (error) {
      app.log.error(error);
      return sendRouteError(reply, error, "Login failed");
    }
  });

  app.post("/forgot-password", async (request, reply) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const email = parsed.data.email.trim().toLowerCase();
      const pending = await createAdminPasswordReset(email);

      if (!pending) {
        return reply.send({ status: "ok", message: RESET_GENERIC });
      }

      // Prefer email when configured; otherwise return an on-screen bypass link for admins.
      if (!isEmailConfigured() || allowPasswordResetBypass()) {
        if (!isEmailConfigured() && !allowPasswordResetBypass()) {
          return reply.status(503).send({
            error:
              "Email delivery is not configured. Ask a Super Admin to reset your password from User Management, or set ADMIN_PASSWORD_RESET_BYPASS=true.",
          });
        }
        if (allowPasswordResetBypass()) {
          const resetPath = `/reset-password?token=${encodeURIComponent(pending.token)}`;
          app.log.warn({ email: pending.email }, "Password reset bypass link issued");
          return reply.send({
            status: "ok",
            message: RESET_GENERIC,
            bypass: true,
            resetPath,
            previewUrl: resetPath,
          });
        }
      }

      try {
        const mailResult = await sendAdminPasswordResetEmail(pending);
        app.log.info(
          { email: pending.email, mailMode: mailResult.mode },
          "Password reset email sent"
        );
        return reply.send({
          status: "ok",
          message: RESET_GENERIC,
          previewUrl: mailResult.previewUrl,
          mailMode: mailResult.mode,
        });
      } catch (mailError) {
        app.log.error(mailError);
        if (allowPasswordResetBypass()) {
          const resetPath = `/reset-password?token=${encodeURIComponent(pending.token)}`;
          return reply.send({
            status: "ok",
            message: RESET_GENERIC,
            bypass: true,
            resetPath,
            previewUrl: resetPath,
          });
        }
        return reply.status(503).send({
          error: "Could not send password reset email. Please try again later.",
        });
      }
    } catch (error) {
      app.log.error(error);
      return sendRouteError(reply, error, "Failed to start password reset");
    }
  });

  app.post("/reset-password", async (request, reply) => {
    try {
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const user = await resetAdminPasswordByToken(
        parsed.data.token,
        parsed.data.password
      );
      if (!user) {
        return reply.status(400).send({
          error: "Invalid or expired reset link. Please request a new one.",
        });
      }

      await touchAdminLastLogin(user.id);
      const token = await reply.jwtSign(toAuthTokenPayload(user));
      return reply.send({
        status: "authenticated",
        token,
        user,
        message: "Password updated. You are now signed in.",
      });
    } catch (error) {
      app.log.error(error);
      return sendRouteError(reply, error, "Password reset failed");
    }
  });

  app.get(
    "/me",
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const user = await findAdminById(request.user.sub);
        if (!user) {
          return reply.status(401).send({ error: "Unauthorized" });
        }
        return reply.send({ user });
      } catch (error) {
        app.log.error(error);
        return sendRouteError(reply, error, "Failed to fetch profile");
      }
    }
  );
};
