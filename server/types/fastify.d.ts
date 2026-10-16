import "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyContextConfig {
    /** Permission-matrix module key(s) checked by requireModuleAccess; any one may grant access. */
    permissionModule?: string | string[];
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: number;
      email: string;
      name: string;
      role: string;
      pwv?: string;
    };
    user: {
      sub: number;
      email: string;
      name: string;
      role: string;
    };
  }
}
