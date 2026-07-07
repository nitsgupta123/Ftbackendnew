import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { getJwtExpiresIn, getJwtSecret } from "../../src/lib/auth-config";

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
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
