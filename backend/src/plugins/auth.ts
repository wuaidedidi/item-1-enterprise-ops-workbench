import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config.js';
import { AppError } from '../utils/http.js';
import { buildCurrentUser } from '../services/shared.js';

async function plugin(app: FastifyInstance) {
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = await request.jwtVerify<{ sub: string }>();
      const userId = Number(auth.sub);
      const current = await buildCurrentUser(userId);
      if (!current || current.status !== 'enabled') {
        throw new AppError('登录已过期，请重新登录', 401, 401);
      }
      request.authUser = {
        id: current.id,
        userName: current.userName,
        realName: current.realName,
        roleId: current.role.id,
        roleCode: current.role.code || '',
        roleName: current.role.name || '',
        isAdmin: current.isAdmin,
        permissions: current.permissions
      };
    } catch (error) {
      throw new AppError('登录已过期，请重新登录', 401, 401);
    }
  });
}

export default fp(plugin);
