import type { FastifyInstance, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { getJwtExpiresIn, getJwtSecret } from "../../src/lib/auth-config";
import {
  findAdminById,
  getAdminSessionFingerprint,
  toAuthTokenPayload,
} from "../../src/lib/auth-repository";
import type { AdminUser } from "../../src/lib/auth-types";

export const SESSION_COOKIE = "ft_admin_session";

const DURATION_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

function expiresInSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/i.exec(value.trim());
  if (!match) return 86400;
  return Number(match[1]) * DURATION_UNITS[(match[2] ?? "s").toLowerCase()];
}

function cookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  };
}

/** Signs a session token for the user and sets it as an httpOnly cookie. */
export async function issueSession(reply: FastifyReply, user: AdminUser): Promise<void> {
  const token = await reply.jwtSign(await toAuthTokenPayload(user));
  reply.setCookie(SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: expiresInSeconds(getJwtExpiresIn()),
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, cookieOptions());
}

export async function registerAuthPlugin(app: FastifyInstance) {
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: getJwtSecret(),
    cookie: {
      cookieName: SESSION_COOKIE,
      signed: false,
    },
    sign: {
      expiresIn: getJwtExpiresIn(),
    },
  });

  app.decorate("authenticate", async function authenticate(request, reply) {
    try {
      await request.jwtVerify();
      const claims = request.user as typeof request.user & { pwv?: string };
      const [user, fingerprint] = await Promise.all([
        findAdminById(claims.sub),
        getAdminSessionFingerprint(claims.sub),
      ]);
      if (!user || !fingerprint || claims.pwv !== fingerprint) {
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
