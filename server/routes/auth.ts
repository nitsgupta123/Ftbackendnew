import type { FastifyPluginAsync } from "fastify";
import {
  createAdminUser,
  findAdminByEmail,
  findAdminById,
  toAuthTokenPayload,
  touchAdminLastLogin,
  verifyAdminPassword,
} from "../../src/lib/auth-repository";
import { loginSchema, signupSchema } from "../../src/lib/auth-validation";
import { sendRouteError } from "../lib/errors";

const INVALID_CREDENTIALS = "Invalid email or password";

export const registerAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post("/signup", async (request, reply) => {
    try {
      const parsed = signupSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password, fullName } = parsed.data;

      const existing = await findAdminByEmail(email);
      if (existing) {
        return reply.status(409).send({ error: "An account with this email already exists" });
      }

      const user = await createAdminUser({ email, password, fullName });
      const token = await reply.jwtSign(toAuthTokenPayload(user));

      return reply.status(201).send({ token, user });
    } catch (error) {
      app.log.error(error);
      return sendRouteError(reply, error, "Signup failed");
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
