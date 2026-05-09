import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    swagger: {
      info: {
        title: '企业运营工作台与权限中心 API',
        description: '用于中小企业内部运营、权限配置和公告协同的后台系统',
        version: '1.0.0'
      },
      consumes: ['application/json'],
      produces: ['application/json']
    }
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
}
