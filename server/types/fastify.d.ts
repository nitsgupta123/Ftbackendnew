import "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: number;
      email: string;
      name: string;
      role: string;
    };
    user: {
      sub: number;
      email: string;
      name: string;
      role: string;
    };
  }
}
