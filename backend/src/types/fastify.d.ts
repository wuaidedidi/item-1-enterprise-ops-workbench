import 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    authUser?: {
      id: number;
      userName: string;
      realName: string;
      roleId: number;
      roleCode: string;
      roleName: string;
      isAdmin: boolean;
      permissions: string[];
    };
  }
}
