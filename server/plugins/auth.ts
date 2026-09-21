import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { getJwtExpiresIn, getJwtSecret } from "../../src/lib/auth-config";
import { findAdminById } from "../../src/lib/auth-repository";

export async function registerAuthPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: getJwtSecret(),
    sign: {
      expiresIn: getJwtExpiresIn(),
    },
  });

  app.decorate("authenticate", async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
      const user = await findAdminById(request.user.sub);
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Keep JWT claims aligned with the live account (role/name/email can change).
      request.user = {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
      };
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
